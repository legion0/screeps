import * as A from './Action';
import { CacheEntrySpec, CacheService, getFromCacheSpec, MutatingCacheService, ObjectCacheService } from "./Cache";
import { errorCodeToString, TERRAIN_PLAIN } from "./constants";
import { log } from "./Logger";
import { findRoomSync, requestCreepSpawn, RoomSync, SpawnQueueItem, SpawnQueuePriority } from "./Room";
import { findNearbyEnergy, fromMemoryWorld, lookNear, posNear, toMemoryWorld } from "./RoomPosition";
import { objectServerCache, rawServerStrongCache } from './ServerCache';
import { isConcreteStructure, isConstructionSiteForStructure, isContainer } from "./Structure";
import { Task } from "./Task";
import { everyN } from "./Tick";

interface SequenceContext {
	creep: Creep;
	task: TaskHarvestSource;
}

const harvestCreepActions = [
	new A.Build<SequenceContext>().setArgs(c => c.task.constructionSite),
	new A.Repair<SequenceContext>().setArgs(c => c.task.container),
	new A.Pickup<SequenceContext>().setArgs(c => findNearbyEnergy(c.creep.pos)),
	new A.Transfer<SequenceContext>().setArgs(c => c.task.container),
	new A.Harvest<SequenceContext>().setArgs(c => c.task.source).setPersist(),
];

const haulCreepActions = [
	new A.Transfer<SequenceContext>().setArgs(c => c.task.roomSync),
	new A.Withdraw<SequenceContext>().setArgs(c => c.task.container).setPersist(),
];

export class TaskHarvestSource extends Task {
	static readonly className = 'HarvestSource' as Id<typeof Task>;

	readonly source: Source;
	readonly container?: StructureContainer;
	readonly constructionSite?: ConstructionSite<STRUCTURE_CONTAINER>;
	readonly roomSync?: RoomSync;

	private readonly cache = new ObjectCacheService<any>(this);

	constructor(sourceId: Id<TaskHarvestSource>) {
		super(TaskHarvestSource, sourceId);
		let source = Game.getObjectById(sourceId as unknown as Id<Source>);
		if (!source) {
			throw new Error(`TaskBootSource cannot find source [${sourceId}]`);
		}
		this.source = source;
		this.container = getFromCacheSpec(containerCache, `${this.id}.container`, this.source.pos) ?? undefined;
		if (!this.container) {
			this.constructionSite = getFromCacheSpec(constructionSiteCache, `${this.id}.constructionSite`, this.source.pos) ?? undefined;
		}
		this.roomSync = findRoomSync(this.source.room) ?? undefined;
		if (isContainer(this.roomSync)) {
			this.roomSync = undefined;
		}
		this.maybePlaceContainer();
	}

	protected run() {
		let name = `${this.id}.harvest`;
		let creep = Game.creeps[name];
		if (creep) {
			A.runSequence(harvestCreepActions, creep, { creep: creep, task: this });
		} else {
			everyN(20, () => {
				requestCreepSpawn(this.source.room, name, harvesterSpawnCallback);
			});
		}
		// name = `${this.id}.haul`;
		// creep = Game.creeps[name];
		// if (creep) {
		// 	A.runSequence(haulCreepActions, creep, { creep: creep, task: this });
		// } else {
		// 	everyN(20, () => {
		// 		requestCreepSpawn(this.source.room, name, haulerSpawnCallback);
		// 	});
		// }
	}

	static create(source: Source) {
		let rv = Task.createBase(TaskHarvestSource, source.id as unknown as Id<Task>);
		if (rv != OK) {
			return rv;
		}
		return new TaskHarvestSource(source.id as unknown as Id<TaskHarvestSource>);
	}

	private maybePlaceContainer() {
		if (this.container || this.constructionSite) {
			return;
		}

		let containerPos = getFromCacheSpec(containerPositionCache, `${this.id}.containerPos`, this.source.pos);
		let rv = containerPos ? containerPos.createConstructionSite(STRUCTURE_CONTAINER) : ERR_NOT_FOUND;
		if (rv != OK) {
			log.e(`Failed to create STRUCTURE_CONTAINER at [${containerPos}] with error [${errorCodeToString(rv)}]`);
		}
	}
}

Task.register.registerTaskClass(TaskHarvestSource);

function findContainer(pos: RoomPosition): StructureContainer | undefined {
	let containers = lookNear(pos, LOOK_STRUCTURES, s => isConcreteStructure(s, STRUCTURE_CONTAINER)) as StructureContainer[];
	return containers[0];
}

function isPosGoodForContainer(pos: RoomPosition) {
	return pos.lookFor(LOOK_CONSTRUCTION_SITES).length == 0 &&
		pos.lookFor(LOOK_TERRAIN)[0] == TERRAIN_PLAIN &&
		pos.lookFor(LOOK_STRUCTURES).length == 0;
}

function harvesterSpawnCallback(room: Room, name: string): SpawnQueueItem {
	let body: BodyPartConstant[] = [];
	if (room.energyCapacityAvailable >= 550) {
		body = [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE];
	} else {
		body = [WORK, CARRY, MOVE, MOVE];
	}

	let cost = _.sum(body, part => BODYPART_COST[part]);
	return {
		priority: SpawnQueuePriority.HARVESTER,
		name: name,
		body: body,
		cost: cost,
	};
}

function haulerSpawnCallback(room: Room, name: string): SpawnQueueItem {
	let body: BodyPartConstant[] = [];
	if (room.energyCapacityAvailable >= 550) {
		body = [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE];
	} else {
		body = [WORK, CARRY, MOVE, MOVE];
	}

	let cost = _.sum(body, part => BODYPART_COST[part]);
	return {
		priority: SpawnQueuePriority.HAULER,
		name: name,
		body: body,
		cost: cost,
	};
}

let containerCache: CacheEntrySpec<StructureContainer, RoomPosition> = {
	cache: objectServerCache as CacheService<StructureContainer>,
	ttl: 50,
	callback: findContainer,
	test: (s: StructureContainer) => {
		return s.store.energy > 0;
	}
};

let constructionSiteCache: CacheEntrySpec<ConstructionSite<STRUCTURE_CONTAINER>, RoomPosition> = {
	cache: objectServerCache as CacheService<ConstructionSite<STRUCTURE_CONTAINER>>,
	ttl: 50,
	callback: (pos: RoomPosition) => {
		let constructionSites = lookNear(pos, LOOK_CONSTRUCTION_SITES, s => isConstructionSiteForStructure(s, STRUCTURE_CONTAINER));
		return (constructionSites[0] ?? null) as ConstructionSite<STRUCTURE_CONTAINER>;
	},
};

let containerPositionCache: CacheEntrySpec<RoomPosition, RoomPosition> = {
	cache: new MutatingCacheService(rawServerStrongCache, fromMemoryWorld, toMemoryWorld),
	ttl: 50,
	callback: (sourcePos: RoomPosition) => {
		return posNear(sourcePos, /*includeSelf=*/false).find(isPosGoodForContainer) ?? null;
	},
};
