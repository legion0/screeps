import * as A from './Action';
import { errorCodeToString, TERRAIN_PLAIN } from "./constants";
import { log } from "./Logger";
import { findMySpawns, findRoomSync, requestCreepSpawn, SpawnQueuePriority } from "./Room";
import { findNearbyEnergy, fromMemoryWorld, getClearance, lookNear, posNear, RoomPositionMemory, toMemoryWorld } from "./RoomPosition";
import { isConcreteStructure, isConstructionSiteForStructure, isSpawnOrExtension } from "./Structure";
import { Task } from "./Task";
import { everyN } from "./Tick";
import { getFromCacheSpec, CacheEntrySpec, CacheService, MutatingCacheService } from './Cache';
import { objectServerCache, rawServerStrongCache } from './ServerCache';
import { memoryCache } from './MemoryCache';

interface SequenceContext {
	creep: Creep;
	task: TaskBootSource;
}

const bootCreepActions = [
	new A.Transfer<SequenceContext>().setArgs(c => c.task.spawnOrExt),
	new A.Build<SequenceContext>().setArgs(c => c.task.constructionSite),
	new A.Repair<SequenceContext>().setArgs(c => c.task.container),
	new A.Pickup<SequenceContext>().setArgs(c => findNearbyEnergy(c.creep.pos)),
	new A.Transfer<SequenceContext>().setArgs(c => c.task.container),
	new A.Harvest<SequenceContext>().setArgs(c => c.task.source).setPersist(),
];

export class TaskBootSource extends Task {
	static readonly className = 'BootSource' as Id<typeof Task>;

	readonly source: Source;
	readonly spawnOrExt?: StructureSpawn | StructureExtension;
	readonly container?: StructureContainer;
	readonly constructionSite?: ConstructionSite<STRUCTURE_CONTAINER>;

	constructor(sourceId: Id<TaskBootSource>) {
		super(TaskBootSource, sourceId);
		let source = Game.getObjectById(sourceId as unknown as Id<Source>);
		if (!source) {
			throw new Error(`TaskBootSource cannot find source [${sourceId}]`);
		}
		this.source = source;
		let roomSync = findRoomSync(this.source.room);
		this.spawnOrExt = isSpawnOrExtension(roomSync) ? roomSync : undefined;

		this.container = getFromCacheSpec(containerCache, `${this.id}.container`, this.source.pos) ?? undefined;
		if (!this.container) {
			this.constructionSite = getFromCacheSpec(constructionSiteCache, `${this.id}.constructionSite`, this.source.pos) ?? undefined;
		}
		this.maybePlaceContainer();
	}

	protected run() {
		let numCreeps = Math.min(getClearance(this.source.pos), 3);
		for (let name of _.range(0, numCreeps).map(i => `${this.id}.${i}`)) {
			let creep = Game.creeps[name];
			if (creep) {
				A.runSequence(bootCreepActions, creep, { creep: creep, task: this });
			} else {
				everyN(20, () => {
					requestCreepSpawn(this.source.room, name, () => ({
						priority: SpawnQueuePriority.WORKER,
						name: name,
						body: [MOVE, MOVE, CARRY, WORK],
						cost: BODYPART_COST[MOVE] + BODYPART_COST[MOVE] + BODYPART_COST[CARRY] + BODYPART_COST[WORK],
					}));
				});
			}
		}
	}

	static create(source: Source) {
		let rv = Task.createBase(TaskBootSource, source.id as unknown as Id<Task>);
		if (rv != OK) {
			return rv;
		}
		return new TaskBootSource(source.id as unknown as Id<TaskBootSource>);
	}

	static remove(source: Source) {
		Task.removeTask(TaskBootSource, source.id as unknown as Id<TaskBootSource>);
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

Task.register.registerTaskClass(TaskBootSource);

function isPosGoodForContainer(pos: RoomPosition) {
	return pos.lookFor(LOOK_CONSTRUCTION_SITES).length == 0 &&
		pos.lookFor(LOOK_TERRAIN)[0] == TERRAIN_PLAIN &&
		pos.lookFor(LOOK_STRUCTURES).length == 0;
}

let containerCache: CacheEntrySpec<StructureContainer, RoomPosition> = {
	cache: objectServerCache as CacheService<StructureContainer>,
	ttl: 50,
	callback: (pos: RoomPosition): StructureContainer | null => {
		let containers = lookNear(pos, LOOK_STRUCTURES, s => isConcreteStructure(s, STRUCTURE_CONTAINER));
		return (containers[0] as StructureContainer | undefined) ?? null;
	},
	test: (s: StructureContainer) => {
		return s.store.energy > 0;
	}
};

let constructionSiteCache: CacheEntrySpec<ConstructionSite<STRUCTURE_CONTAINER>, RoomPosition> = {
	cache: objectServerCache as CacheService<ConstructionSite<STRUCTURE_CONTAINER>>,
	ttl: 50,
	callback: (pos: RoomPosition) => {
		let constructionSites = lookNear(pos, LOOK_CONSTRUCTION_SITES, s => isConstructionSiteForStructure(s, STRUCTURE_CONTAINER));
		return (constructionSites[0] as ConstructionSite<STRUCTURE_CONTAINER>) ?? null;
	},
};

let containerPositionCache: CacheEntrySpec<RoomPosition, RoomPosition> = {
	cache: new MutatingCacheService(rawServerStrongCache, fromMemoryWorld, toMemoryWorld),
	ttl: 50,
	callback: (sourcePos: RoomPosition) => {
		return posNear(sourcePos, /*includeSelf=*/false).find(isPosGoodForContainer) ?? null;
	},
};
