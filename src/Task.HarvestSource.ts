import * as A from './Action';
import {CacheEntrySpec, CacheService, getFromCacheSpec, MutatingCacheService, ObjectCacheService} from './Cache';
import {errorCodeToString, TERRAIN_PLAIN} from './constants';
import {findNearbyEnergy, fromMemoryWorld, lookNear, posNear, toMemoryWorld} from './RoomPosition';
import {findRoomSync, requestCreepSpawn, RoomSync, SpawnQueueItem, SpawnQueuePriority} from './Room';
import {isConcreteStructure, isConstructionSiteForStructure, isContainer} from './Structure';
import {objectServerCache, rawServerStrongCache} from './ServerCache';
import {everyN} from './Tick';
import {log} from './Logger';
import {Task} from './Task';

interface SequenceContext {
	creep: Creep;
	task: TaskHarvestSource;
}

const harvestCreepActions = [
	new A.Build<SequenceContext>().setArgs((c) => c.task.constructionSite),
	new A.Repair<SequenceContext>().setArgs((c) => c.task.container),
	new A.Pickup<SequenceContext>().setArgs((c) => findNearbyEnergy(c.creep.pos)),
	new A.Transfer<SequenceContext>().setArgs((c) => c.task.container),
	new A.Harvest<SequenceContext>().setArgs((c) => c.task.source).
		setPersist(),
];

function findContainer (pos: RoomPosition): StructureContainer | undefined {
	const containers = lookNear(
		pos,
		LOOK_STRUCTURES,
		(s) => isConcreteStructure(
			s,
			STRUCTURE_CONTAINER
		)
	) as StructureContainer[];


	return containers[0];
}

const containerCache: CacheEntrySpec<StructureContainer, RoomPosition> = {
	'cache': objectServerCache as CacheService<StructureContainer>,
	'ttl': 50,
	'callback': findContainer,
	'test': (s: StructureContainer) => s.store.energy > 0,
};

const constructionSiteCache: CacheEntrySpec<ConstructionSite<STRUCTURE_CONTAINER>, RoomPosition> = {
	'cache': objectServerCache as CacheService<ConstructionSite<STRUCTURE_CONTAINER>>,
	'ttl': 50,
	'callback': (pos: RoomPosition) => {
		const constructionSites = lookNear(
			pos,
			LOOK_CONSTRUCTION_SITES,
			(s) => isConstructionSiteForStructure(
				s,
				STRUCTURE_CONTAINER
			)
		);
		return (constructionSites[0] ?? null) as ConstructionSite<STRUCTURE_CONTAINER>;
	},
};

function isPosGoodForContainer (pos: RoomPosition) {
	return pos.lookFor(LOOK_CONSTRUCTION_SITES).length === 0 &&
		pos.lookFor(LOOK_TERRAIN)[0] === TERRAIN_PLAIN &&
		pos.lookFor(LOOK_STRUCTURES).length === 0;
}

const containerPositionCache: CacheEntrySpec<RoomPosition, RoomPosition> = {
	'cache': new MutatingCacheService(
		rawServerStrongCache,
		fromMemoryWorld,
		toMemoryWorld
	),
	'ttl': 50,
	'callback': (sourcePos: RoomPosition) => posNear(
		sourcePos,
		/* IncludeSelf= */ false
	).find(isPosGoodForContainer) ?? null,
};

function harvesterSpawnCallback (room: Room, name: string): SpawnQueueItem {
	let body: BodyPartConstant[] = [];

	if (room.energyCapacityAvailable >= 550) {
		body = [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE];
	} else {
		body = [WORK, CARRY, MOVE, MOVE];
	}

	const cost = _.sum(body, (part) => BODYPART_COST[part]);


	return {
		'priority': SpawnQueuePriority.HARVESTER,
		name,
		body,
		cost,
	};
}

export class TaskHarvestSource extends Task {
	static readonly className = 'HarvestSource' as Id<typeof Task>;

	readonly source: Source;

	readonly container?: StructureContainer;

	readonly constructionSite?: ConstructionSite<STRUCTURE_CONTAINER>;

	readonly roomSync?: RoomSync;

	private readonly cache: ObjectCacheService<any>;

	constructor (sourceId: Id<TaskHarvestSource>) {
		super(
			TaskHarvestSource,
			sourceId
		);
		this.cache = new ObjectCacheService<any>(this);
		const source = Game.getObjectById(sourceId as unknown as Id<Source>);

		if (!source) {
			throw new Error(`TaskBootSource cannot find source [${sourceId}]`);
		}
		this.source = source;
		this.container = getFromCacheSpec(
			containerCache,
			`${this.id}.container`,
			this.source.pos
		) ?? undefined;
		if (!this.container) {
			this.constructionSite = getFromCacheSpec(
				constructionSiteCache,
				`${this.id}.constructionSite`,
				this.source.pos
			) ?? undefined;
		}
		this.roomSync = findRoomSync(this.source.room) ?? undefined;
		if (isContainer(this.roomSync)) {
			this.roomSync = undefined;
		}
		this.maybePlaceContainer();
	}

	protected run () {
		const name = `${this.id}.harvest`;
		const creep = Game.creeps[name];

		if (creep) {
			A.runSequence(
				harvestCreepActions,
				creep,
				{
					creep,
					'task': this,
				}
			);
		} else {
			everyN(
				20,
				() => {
					requestCreepSpawn(
						this.source.room,
						name,
						harvesterSpawnCallback
					);
				}
			);
		}
	}

	static create (source: Source) {
		const rv = Task.createBase(TaskHarvestSource, source.id as unknown as Id<Task>);
		if (rv !== OK) {
			return rv;
		}
		return new TaskHarvestSource(source.id as unknown as Id<TaskHarvestSource>);
	}

	private maybePlaceContainer () {
		if (this.container || this.constructionSite) {
			return;
		}
		const containerPos = getFromCacheSpec(
			containerPositionCache,
			`${this.id}.containerPos`,
			this.source.pos
		);
		const rv = containerPos ? containerPos.createConstructionSite(STRUCTURE_CONTAINER) : ERR_NOT_FOUND;
		if (rv !== OK) {
			log.e(`Failed to create STRUCTURE_CONTAINER at [${containerPos}] with error [${errorCodeToString(rv)}]`);
		}
	}
}

Task.register.registerTaskClass(TaskHarvestSource);
