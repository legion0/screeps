import * as A from './Action';
import { createBodySpec, getBodyForRoom } from './BodySpec';
import { CacheEntrySpec, CacheService, getFromCacheSpec, MutatingCacheService } from './Cache';
import { errorCodeToString, GENERIC_WORKER, TERRAIN_PLAIN } from './constants';
import { getActiveCreepTtl, getLiveCreepsAll, isActiveCreepSpawning } from './Creep';
import { log } from './Logger';
import { findRoomSync, SpawnQueuePriority } from './Room';
import { findNearbyEnergy, fromMemoryWorld, getClearance, lookNear, posNear, toMemoryWorld } from './RoomPosition';
import { objectServerCache, rawServerStrongCache } from './ServerCache';
import { SpawnQueue, SpawnRequest } from './SpawnQueue';
import { isConcreteStructure, isConstructionSiteForStructure, isSpawnOrExtension } from './Structure';
import { Task } from './Task';
import { everyN } from './Tick';

interface SequenceContext {
	creep: Creep;
	task: TaskBootSource;
}

const sequence = [
	new A.Transfer<SequenceContext>().setArgs((c) => c.task.spawnOrExt),
	new A.Build<SequenceContext>().setArgs((c) => c.task.constructionSite),
	new A.Repair<SequenceContext>().setArgs((c) => c.task.container),
	new A.Pickup<SequenceContext>().setArgs((c) => findNearbyEnergy(c.creep.pos)),
	new A.Transfer<SequenceContext>().setArgs((c) => c.task.container),
	new A.Harvest<SequenceContext>().setArgs((c) => c.task.source).setPersist(),
];

const containerCache: CacheEntrySpec<StructureContainer, RoomPosition> = {
	cache: objectServerCache as CacheService<StructureContainer>,
	ttl: 50,
	callback: (pos: RoomPosition): StructureContainer | null => {
		const containers = lookNear(pos, LOOK_STRUCTURES, (s) => isConcreteStructure(s, STRUCTURE_CONTAINER));
		return containers[0] as StructureContainer | undefined ?? null;
	},
	test: (s: StructureContainer) => s.store.energy > 0,
};

const constructionSiteCache: CacheEntrySpec<ConstructionSite<STRUCTURE_CONTAINER>, RoomPosition> = {
	cache: objectServerCache as CacheService<ConstructionSite<STRUCTURE_CONTAINER>>,
	ttl: 50,
	callback: (pos: RoomPosition) => {
		const constructionSites = lookNear(
			pos, LOOK_CONSTRUCTION_SITES, (s) => isConstructionSiteForStructure(s, STRUCTURE_CONTAINER)
		);
		return constructionSites[0] as ConstructionSite<STRUCTURE_CONTAINER> ?? null;
	},
};

const containerPositionCache: CacheEntrySpec<RoomPosition, RoomPosition> = {
	cache: new MutatingCacheService(rawServerStrongCache, fromMemoryWorld, toMemoryWorld),
	ttl: 50,
	callback: (sourcePos: RoomPosition) => posNear(
		sourcePos, /* includeSelf=*/false
	).find(isPosGoodForContainer) ?? null,
};

export class TaskBootSource extends Task {
	static readonly className = 'BootSource' as Id<typeof Task>;

	readonly source: Source;

	readonly spawnOrExt?: StructureSpawn | StructureExtension;

	readonly container?: StructureContainer;

	readonly constructionSite?: ConstructionSite<STRUCTURE_CONTAINER>;

	constructor(sourceId: Id<TaskBootSource>) {
		super(TaskBootSource, sourceId);
		const source = Game.getObjectById(sourceId as unknown as Id<Source>);
		if (!source) {
			throw new Error(`TaskBootSource cannot find source [${sourceId}]`);
		}
		this.source = source;
		const roomSync = findRoomSync(this.source.room);
		this.spawnOrExt = isSpawnOrExtension(roomSync) ? roomSync : undefined;

		this.container = getFromCacheSpec(containerCache, `${this.id}.container`, this.source.pos) ?? undefined;
		if (!this.container) {
			this.constructionSite = getFromCacheSpec(constructionSiteCache, `${this.id}.constructionSite`, this.source.pos) ?? undefined;
		}
		this.maybePlaceContainer();
	}

	protected run() {
		everyN(20, () => {
			for (const name of this.creepNames()) {
				if (getActiveCreepTtl(name) > 50 || isActiveCreepSpawning(name)) {
					continue;
				}
				const queue = SpawnQueue.getSpawnQueue();
				queue.has(name) || queue.push(buildSpawnRequest(this.source.room, name));
			}
		});

		for (const creep of getLiveCreepsAll(this.creepNames())) {
			A.runSequence(sequence, creep, { creep, task: this });
		}
	}

	private creepNames(): string[] {
		const numCreeps = Math.min(getClearance(this.source.pos), 3);
		return _.range(0, numCreeps).map((i) => `${this.id}.${i}`);
	}

	static create(source: Source) {
		const rv = Task.createBase(TaskBootSource, source.id as unknown as Id<Task>);
		if (rv !== OK) {
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

		const containerPos = getFromCacheSpec(containerPositionCache, `${this.id}.containerPos`, this.source.pos);
		const rv = containerPos ? containerPos.createConstructionSite(STRUCTURE_CONTAINER) : ERR_NOT_FOUND;
		if (rv !== OK) {
			log.e(`Failed to create STRUCTURE_CONTAINER at [${containerPos}] with error [${errorCodeToString(rv)}]`);
		}
	}
}

Task.register.registerTaskClass(TaskBootSource);

const bodySpec = createBodySpec([GENERIC_WORKER]);

function buildSpawnRequest(room: Room, name: string): SpawnRequest {
	return {
		name,
		body: getBodyForRoom(room, bodySpec),
		priority: SpawnQueuePriority.WORKER,
		time: Game.time + getActiveCreepTtl(name),
		pos: room.controller.pos,
	};
}

function isPosGoodForContainer(pos: RoomPosition) {
	return pos.lookFor(LOOK_CONSTRUCTION_SITES).length === 0 &&
		pos.lookFor(LOOK_TERRAIN)[0] === TERRAIN_PLAIN &&
		pos.lookFor(LOOK_STRUCTURES).length === 0;
}
