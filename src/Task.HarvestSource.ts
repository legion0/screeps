import * as A from './Action';
import { createBodySpec, getBodyForRoom } from './BodySpec';
import { CacheEntrySpec, CacheService, getFromCacheSpec, MutatingCacheService } from './Cache';
import { errorCodeToString, GENERIC_WORKER, TERRAIN_PLAIN } from './constants';
import { getActiveCreepTtl, getLiveCreeps, isActiveCreepSpawning } from './Creep';
import { log } from './Logger';
import { RoomSync } from './Room';
import { findNearbyEnergy, fromMemoryWorld, lookNear, posNear, toMemoryWorld } from './RoomPosition';
import { objectServerCache, rawServerStrongCache } from './ServerCache';
import { SpawnQueue, SpawnQueuePriority, SpawnRequest } from './SpawnQueue';
import { isConcreteStructure, isConstructionSiteForStructure } from './Structure';
import { Task } from './Task';
import { everyN } from './Tick';

interface SequenceContext {
	creep: Creep;
	task: TaskHarvestSource;
}

const harvestCreepActions = [
	new A.Build<SequenceContext>().setArgs((c) => c.task.constructionSite),
	new A.Repair<SequenceContext>().setArgs((c) => c.task.container),
	new A.Pickup<SequenceContext>().setArgs((c) => findNearbyEnergy(c.creep.pos)),
	new A.Transfer<SequenceContext>().setArgs((c) => c.task.container),
	new A.Harvest<SequenceContext>().setArgs((c) => c.task.source).setPersist(),
];


const containerCache: CacheEntrySpec<StructureContainer, RoomPosition> = {
	cache: objectServerCache as CacheService<StructureContainer>,
	ttl: 50,
	callback: findContainer,
	test: (s: StructureContainer) => s.store.energy > 0,
};

const constructionSiteCache: CacheEntrySpec<ConstructionSite<STRUCTURE_CONTAINER>, RoomPosition> = {
	cache: objectServerCache as CacheService<ConstructionSite<STRUCTURE_CONTAINER>>,
	ttl: 50,
	callback: (pos: RoomPosition) => {
		const constructionSites = lookNear(
			pos, LOOK_CONSTRUCTION_SITES, (s) => isConstructionSiteForStructure(s, STRUCTURE_CONTAINER)
		);
		return (constructionSites[0] ?? null) as ConstructionSite<STRUCTURE_CONTAINER>;
	},
};

const containerPositionCache: CacheEntrySpec<RoomPosition, RoomPosition> = {
	cache: new MutatingCacheService(rawServerStrongCache, fromMemoryWorld, toMemoryWorld),
	ttl: 50,
	callback: (sourcePos: RoomPosition) => posNear(
		sourcePos, /* includeSelf=*/false
	).find(isPosGoodForContainer) ?? null,
};

export class TaskHarvestSource extends Task {
	static readonly className = 'HarvestSource' as Id<typeof Task>;

	readonly source: Source;

	readonly container?: StructureContainer;

	readonly constructionSite?: ConstructionSite<STRUCTURE_CONTAINER>;

	readonly roomSync?: RoomSync;

	constructor(sourceId: Id<TaskHarvestSource>) {
		super(TaskHarvestSource, sourceId);
		const source = Game.getObjectById(sourceId as unknown as Id<Source>);

		if (!source) {
			throw new Error(`TaskBootSource cannot find source [${sourceId}]`);
		}
		this.source = source;
		this.container = getFromCacheSpec(containerCache, `${this.id}.container`, this.source.pos) ?? undefined;
		if (!this.container) {
			this.constructionSite = getFromCacheSpec(constructionSiteCache, `${this.id}.constructionSite`, this.source.pos) ?? undefined;
			if (!this.constructionSite) {
				this.placeContainer();
			}
		}
	}

	protected run() {
		const name = `${this.id}.harvest`;

		everyN(20, () => {
			if (getActiveCreepTtl(name) < 50 && !isActiveCreepSpawning(name)) {
				const queue = SpawnQueue.getSpawnQueue();
				queue.has(name) || queue.push(buildSpawnRequest(this.source.room, name, this.source.pos));
			}
		});

		for (const creep of getLiveCreeps(name)) {
			A.runSequence(harvestCreepActions, creep, { creep, task: this });
		}
	}

	static create(source: Source) {
		const rv = Task.createBase(TaskHarvestSource, source.id as unknown as Id<Task>);
		if (rv !== OK) {
			return rv;
		}
		return new TaskHarvestSource(source.id as unknown as Id<TaskHarvestSource>);
	}

	private placeContainer() {
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

const bodySpec = createBodySpec([
	[WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE],
	[WORK, WORK, CARRY, MOVE],
]);

function buildSpawnRequest(room: Room, name: string, sourcePos: RoomPosition): SpawnRequest {
	return {
		name,
		body: getBodyForRoom(room, bodySpec),
		priority: SpawnQueuePriority.HARVESTER,
		time: Game.time + getActiveCreepTtl(name),
		pos: sourcePos,
	};
}

function findContainer(pos: RoomPosition): StructureContainer | undefined {
	const containers = lookNear(
		pos, LOOK_STRUCTURES, (s) => isConcreteStructure(s, STRUCTURE_CONTAINER)
	) as StructureContainer[];
	return containers[0];
}
function isPosGoodForContainer(pos: RoomPosition) {
	return pos.lookFor(LOOK_CONSTRUCTION_SITES).length === 0 &&
		pos.lookFor(LOOK_TERRAIN)[0] === TERRAIN_PLAIN &&
		pos.lookFor(LOOK_STRUCTURES).length === 0;
}
