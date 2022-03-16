import { findMaxBy, findMinBy } from './Array';
import { CacheEntrySpec, CacheService, getFromCacheSpec, tickCacheService } from './Cache';
import { errorCodeToString } from './constants';
import { EventEnum, events } from './Events';
import { log } from './Logger';
import { memInit } from './Memory';
import { PriorityQueue } from './PriorityQueue';
import { fromMemoryWorld, getClearance, lookForStructureAt, posKey, posNear, RoomPositionMemory, toMemoryWorld } from './RoomPosition';
import { objectServerCache } from './ServerCache';
import { getUsedCapacity, hasUsedCapacity } from './Store';
import { filterStructureType, isExtension, isSpawn, isSpawnOrExtension, isWalkableStructure } from './Structure';
import { everyN } from './Tick';
import { sortById } from './util';

declare global {
	interface RoomMemory {
		constructionQueueSize?: number;
	}
	interface CreepMemory {
		energy_source?: Id<StructureStorage | StructureContainer>;
	}
}

export enum BuildQueuePriority {
	UNKNOWN,
	ROAD,
	STORAGE_CONTAINER,
	EXTENSION,
}

export interface SpawnQueueItem {
	priority: number;
	name: string;
	body: BodyPartConstant[];
	cost: number;
	opts?: SpawnOptions;
}

export interface BuildQueueItem {
	pos: RoomPositionMemory;
	structureType: BuildableStructureConstant;
	priority: number;
	name: string;
}

interface RoomMemory {
	spawnQueue: PriorityQueue<SpawnQueueItem>;
}

function spawnQueueCompareFunc(lhs: SpawnQueueItem, rhs: SpawnQueueItem): boolean {
	return lhs.priority < rhs.priority;
}

function spawnQueueKeyFunc(item: SpawnQueueItem): string {
	return item.name;
}

function buildQueueCompareFunc(lhs: BuildQueueItem, rhs: BuildQueueItem): boolean {
	return lhs.priority < rhs.priority;
}

function buildQueueKeyFunc(item: BuildQueueItem): string {
	return item.name;
}

export function requestConstruction(
	pos: RoomPosition, structureType: BuildableStructureConstant, priority: BuildQueuePriority
) {
	const queue = PriorityQueue.loadOrCreate(
		Memory.rooms[pos.roomName], 'buildQueue', buildQueueCompareFunc, buildQueueKeyFunc
	);
	const name = `${posKey(pos)}_${structureType}`;
	if (queue.hasItem(name)) {
		return ERR_NAME_EXISTS;
	}
	if (lookForStructureAt(structureType, pos)) {
		return ERR_FULL;
	}
	queue.push({
		pos: toMemoryWorld(pos),
		structureType,
		priority,
		name,
	});
	memInit(Memory.rooms, pos.roomName, {});
	memInit(Memory.rooms[pos.roomName], 'constructionQueueSize', 0);
	Memory.rooms[pos.roomName].constructionQueueSize += CONSTRUCTION_COST[structureType];
	return OK;
}

export function currentConstruction(roomName: string): ConstructionSite | null {
	let constructionSite = tickCacheService.get(`${roomName}.currentConstruction`) as ConstructionSite | null | undefined;
	if (constructionSite !== undefined) {
		return constructionSite;
	}
	const queue = PriorityQueue.loadOrCreate(
		memInit(Memory.rooms, roomName, {}), 'buildQueue', buildQueueCompareFunc, buildQueueKeyFunc
	);
	if (queue.isEmpty()) {
		tickCacheService.set(`${roomName}.currentConstruction`, null);
		return null;
	}
	while (!queue.isEmpty()) {
		const item = queue.peek();
		const pos = fromMemoryWorld(item.pos);
		// log.d2(`Next Construction is at [${pos}] from`, item);
		// log.d2(toMemoryWorld(new RoomPosition(7, 12, 'W7N7')));
		constructionSite = pos.lookFor(LOOK_CONSTRUCTION_SITES)
			.find((s) => s.my && s.structureType === item.structureType);
		if (constructionSite) {
			break;
		}
		const finishedConstruction = _.find(pos.lookFor(LOOK_STRUCTURES),
			(s) => s.structureType === item.structureType);
		if (!finishedConstruction) {
			const rv = pos.createConstructionSite(item.structureType);
			if (rv !== OK) {
				log.e(`Failed to create construction [${item.structureType}] at [${pos}] with error: [${errorCodeToString(rv)}]`);
				queue.pop();
			}

			// TODO: work out better planning to have the construction site placed
			// before the previous one is fully done.
			// e.g. save the current out of the queue and always place the queue
			// peek on so we have the current and next (still better then all).
			constructionSite = null;
			break;
		}
		memInit(Memory.rooms[roomName], 'constructionQueueSize', 0);
		Memory.rooms[roomName].constructionQueueSize -= CONSTRUCTION_COST[item.structureType];
		queue.pop();
	}
	constructionSite = constructionSite ?? null;
	tickCacheService.set(`${roomName}.currentConstruction`, constructionSite);
	return constructionSite;
}

export function constructionQueueSize(roomName: string): number {
	let currentSize = memInit(Memory.rooms[roomName], 'constructionQueueSize', 0);
	if (currentSize > 0) {
		const queue = PriorityQueue.loadOrCreate(
			Memory.rooms[roomName], 'buildQueue', buildQueueCompareFunc, buildQueueKeyFunc
		);
		if (queue.isEmpty()) {
			currentSize = Memory.rooms[roomName].constructionQueueSize = 0;
		}
	}
	return currentSize;
}

events.listen(EventEnum.EVENT_TICK_END, () => {
	for (const room of Object.values(Game.rooms)) {
		const queue = PriorityQueue.loadOrCreate(room.memory, 'spawnQueue', spawnQueueCompareFunc, spawnQueueKeyFunc);
		const spawns = findMySpawns(room).filter((s) => !s.spawning);
		while (!queue.isEmpty() && spawns.length > 0) {
			if (room.energyAvailable < queue.peek().cost) {
				everyN(50, () => log.w(`Not enough energy for swawning next request in room [${room.name}]`));
				break;
			}
			const request = queue.pop()!;
			const rv = spawns.pop()!.spawnCreep(request.body, request.name, request.opts);
			if (rv !== OK) {
				log.e(`Failed to spawn new creep with error [${errorCodeToString(rv)}]`);
			}
		}
	}
});

export function findSources(room: Room): Source[] {
	return sortById(room.find(FIND_SOURCES));
}

export function findMySpawns(room: Room): StructureSpawn[] {
	return sortById(room.find(FIND_MY_SPAWNS));
}

export function findMySpawnsOrExtensions(room: Room): (StructureSpawn | StructureExtension)[] {
	return sortById(room.find(FIND_MY_STRUCTURES).filter(isSpawnOrExtension));
}

export function findMyExtensions(room: Room): StructureExtension[] {
	return sortById(room.find(FIND_MY_STRUCTURES).filter(isExtension)) as StructureExtension[];
}

export function findMyConstructionSites(room: Room): ConstructionSite[] {
	return sortById(room.find(FIND_MY_CONSTRUCTION_SITES));
}

export function findMyStructures(room: Room): AnyOwnedStructure[] {
	return sortById(room.find(FIND_MY_STRUCTURES));
}

export function findStructures(room: Room): AnyStructure[] {
	return sortById(room.find(FIND_STRUCTURES));
}

export function findStructuresByType<T extends StructureConstant>(room: Room, type: T): ConcreteStructure<T>[] {
	return room ? filterStructureType(room.find(FIND_STRUCTURES), type) : [];
}

export function findMyStorage(room: Room) {
	const storages = findStructuresByType(room, STRUCTURE_STORAGE).filter(s => s.my);
	return storages.length ? storages[0] : null;
}

export type RoomSource = Resource<RESOURCE_ENERGY> | Tombstone | StructureContainer | Source;

export function isRoomSource(s: any): s is RoomSource {
	return s instanceof StructureContainer ||
		s instanceof Source ||
		s instanceof Resource && s.resourceType === RESOURCE_ENERGY ||
		s instanceof Tombstone && s.store.energy > 0;
}

const findRoomSourceCache: CacheEntrySpec<RoomSource, Room> = {
	cache: objectServerCache as CacheService<RoomSource | null>,
	ttl: 50,
	callback: (room: Room): RoomSource | null => {
		const structures = findStructures(room);

		let roomSource: RoomSource | null = null;
		const tombStone = getRecyclePos(room)?.lookFor(LOOK_TOMBSTONES).find((t) => t.store.energy);
		if (tombStone) {
			roomSource = tombStone;
		}

		if (!roomSource) {
			const recycledEnergy = getRecyclePos(room)?.lookFor(LOOK_ENERGY)[0];
			if (recycledEnergy) {
				roomSource = recycledEnergy;
			}
		}

		if (!roomSource) {
			const containers = filterStructureType(structures, STRUCTURE_CONTAINER).filter((s) => hasUsedCapacity(s));
			const container = findMaxBy<StructureContainer>(containers, getUsedCapacity);
			if (container) {
				roomSource = container;
			}
		}

		if (!roomSource) {
			const source = findSources(room).filter((s) => hasUsedCapacity(s) && getClearance(s.pos) > 1)[0] as Source;
			if (source) {
				roomSource = source;
			}
		}

		return roomSource;
	},
	test: (roomSource: RoomSource): boolean => hasUsedCapacity(roomSource),
};

export function findRoomSource(room: Room): RoomSource | undefined {
	return getFromCacheSpec(findRoomSourceCache, `${room.name}.roomSource`, room) ?? undefined;
}

// Returns a conventional energy source, either storage or container.
// Returns the closest container if it meets minLoadNear, otherwise returns the closest that meets minLoadFar.
export function findEnergySource(room: Room, pos: RoomPosition, minLoadNear: number, minLoadFar: number) {
	const storage = findMyStorage(room);
	if (storage) {
		return storage;
	}

	let containers = findStructuresByType(room, STRUCTURE_CONTAINER);
	if (containers.length) {
		const closest = findMinBy(containers, c => c.pos.getRangeTo(pos));
		if (containerHasLoad(closest, minLoadNear)) {
			return closest;
		}
		containers = containers.filter(c => c.id != closest.id && containerHasLoad(c, minLoadFar));
		if (containers.length) {
			return findMinBy(containers, c => c.pos.getRangeTo(pos));
		}
	}

	return null;
}

function containerHasLoad(source: StructureStorage | StructureContainer | undefined, minLoad: number) {
	if (source) {
		return source.store.getUsedCapacity(RESOURCE_ENERGY) / source.store.getCapacity(RESOURCE_ENERGY) > minLoad;
	}
	return false;
}

export function findEnergySourceForCreep(creep: Creep, minLoad: number, switchLoad: number): StructureStorage | StructureContainer | null {
	if (minLoad >= switchLoad) {
		throw new Error(`Invalid arguments minLoad [${minLoad}] >= switchLoad [${switchLoad}]`);
	}
	if (creep.memory.energy_source) {
		const source = Game.getObjectById(creep.memory.energy_source);
		if (containerHasLoad(source, minLoad)) {
			return source;
		} else {
			delete creep.memory.energy_source;
			return findEnergySourceForCreep(creep, minLoad, switchLoad);
		}
	}
	const source = findEnergySource(creep.room, creep.pos, minLoad, switchLoad);
	if (containerHasLoad(source, minLoad)) {
		creep.memory.energy_source = source.id;
		return source;
	}
	return null;
}

export type RoomSync = StructureSpawn | StructureExtension | StructureContainer;
export function isRoomSync(s: any): s is RoomSync {
	return s instanceof StructureSpawn || s instanceof StructureExtension || s instanceof StructureContainer;
}
export function findRoomSync(room: Room): RoomSync | undefined {
	const structures = findStructures(room);
	let sync: RoomSync | undefined;

	const spawn = findMinBy(structures.filter(isSpawn), (s) => s.energy);
	if (!sync && spawn && spawn.energy < spawn.energyCapacity) {
		sync = spawn;
	}

	const ext = findMinBy(structures.filter(isExtension), (s) => s.energy);
	if (!sync && ext && ext.energy < ext.energyCapacity) {
		sync = ext;
	}

	const container = findMinBy(
		filterStructureType(structures, STRUCTURE_CONTAINER).filter((s) => s.store.getFreeCapacity(RESOURCE_ENERGY)),
		(s) => s.store.energy
	);
	if (!sync && container) {
		sync = container;
	}
	return sync;
}

export function getRecyclePos(room: Room): RoomPosition | undefined {
	const spawns = findMySpawns(room);
	if (spawns.length === 0) {
		return undefined;
	}
	const pos = posNear(spawns[0].pos, false).find(isGoodRecyclePos) ?? undefined;
	if (pos) {
		Game.rooms[pos.roomName].visual.circle(pos.x, pos.y, { fill: 'blue' });
	}
	return pos;
}

function isGoodRecyclePos(pos: RoomPosition): boolean {
	return pos.lookFor(LOOK_STRUCTURES).every((s) => isWalkableStructure(s));
}

export function getRoomStorageCapacity(room: Room, resource: ResourceConstant) {
	return _.sum(findStructuresByType(room, STRUCTURE_STORAGE).filter(s => s.my), s => s.store.getCapacity(resource))
		+ _.sum(findStructuresByType(room, STRUCTURE_CONTAINER), s => s.store.getCapacity(resource));
}

export function getRoomStorageUsedCapacity(room: Room, resource: ResourceConstant) {
	return _.sum(findStructuresByType(room, STRUCTURE_STORAGE).filter(s => s.my), s => s.store.getUsedCapacity(resource))
		+ _.sum(findStructuresByType(room, STRUCTURE_CONTAINER), s => s.store.getUsedCapacity(resource));
}

export function getRoomStorageLoad(room: Room, resource: ResourceConstant) {
	const capacity = getRoomStorageCapacity(room, resource);
	if (capacity == 0) {
		return 0;
	}
	return getRoomStorageUsedCapacity(room, resource) / capacity;
}

export function findRecycledEnergy(room: Room) {
	const recyclePos = getRecyclePos(room);
	if (recyclePos) {
		const tombStone = recyclePos.lookFor(LOOK_TOMBSTONES).find((t) => t.store.getUsedCapacity(RESOURCE_ENERGY));
		if (tombStone) {
			return tombStone;
		}
		const recycledEnergy = recyclePos.lookFor(LOOK_ENERGY)[0];
		if (recycledEnergy) {
			return recycledEnergy;
		}
	}
	return null;
}
