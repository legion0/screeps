import { getWithCallback, objectsServerCache, objectServerCache, tickCacheService } from "./Cache";
import { errorCodeToString } from "./constants";
import { EventEnum, events } from "./Events";
import { log } from "./Logger";
import { PriorityQueue } from "./PriorityQueue";
import { isConcreteStructure, filterStructureType, isSpawnOrExtension } from "./Structure";
import { everyN } from "./Tick";
import { sortById } from "./util";
import { findMinBy, findMaxBy } from "./Array";

export enum SpawnQueuePriority {
	WORKER,
	HAULER,
	HARVESTER,
	BUILDER,
	UPGRADER,
}

export interface SpawnQueueItem {
	priority: number;
	name: string;
	body: BodyPartConstant[];
	cost: number;
	opts?: SpawnOptions;
}

interface RoomMemory {
	spawnQueue: PriorityQueue<SpawnQueueItem>;
}

function compareFunc(lhs: SpawnQueueItem, rhs: SpawnQueueItem) {
	return lhs.priority < rhs.priority;
}

function keyFunc(item: SpawnQueueItem) {
	return item.name;
}

export function requestCreepSpawn(room: Room, name: string, callback: (room?: Room, name?: string) => SpawnQueueItem) {
	if (Game.creeps[name]) {
		return ERR_NAME_EXISTS;
	}
	let queue = PriorityQueue.loadOrCreate(Memory.rooms[room.name], 'spawnQueue', compareFunc, keyFunc);
	if (queue.hasItem(name)) {
		return ERR_NAME_EXISTS;
	}
	queue.push(callback(room, name));
	return OK;
}

events.listen(EventEnum.EVENT_TICK_END, () => {
	for (let room of Object.values(Game.rooms)) {
		let queue = PriorityQueue.loadOrCreate(room.memory, 'spawnQueue', compareFunc, keyFunc);
		let spawns = findMySpawns(room).filter(s => !s.spawning);
		while (!queue.isEmpty() && spawns.length > 0) {
			if (room.energyAvailable < queue.peek().cost) {
				everyN(50, () => log.w(`Not enough energy for swawning next request in room [${room.name}]`));
				break;
			}
			let request = queue.pop();
			let rv = spawns.pop().spawnCreep(request.body, request.name, request.opts);
			if (rv != OK) {
				log.e(`Failed to spawn new creep with error [${errorCodeToString(rv)}]`);
			} else {
				// room.energyAvailable -= request.cost;
			}
		}
	}
});

export function findSources(room: Room) {
	return (room ? getWithCallback(objectsServerCache, `${room.name}.sources`, 100, findSourcesImpl, room) : []) as Source[];
}
function findSourcesImpl(room: Room): Source[] {
	return sortById(room.find(FIND_SOURCES));
}

export function findMySpawns(room: Room): StructureSpawn[] {
	return (room ? getWithCallback(objectsServerCache, `${room.name}.spawns`, 100, findMySpawnsImpl, room) : []) as StructureSpawn[];
}
function findMySpawnsImpl(room: Room): StructureSpawn[] {
	return sortById(room.find(FIND_MY_SPAWNS));
}

export function findMySpawnsOrExtensions(room: Room): (StructureSpawn | StructureExtension)[] {
	return (room ? getWithCallback(objectsServerCache, `${room.name}.spawnsOrExtensions`, 50, findMySpawnsOrExtensionsImpl, room) : []) as (StructureSpawn | StructureExtension)[];
}
function findMySpawnsOrExtensionsImpl(room: Room): (StructureSpawn | StructureExtension)[] {
	return sortById(room.find(FIND_MY_STRUCTURES).filter(isSpawnOrExtension));
}

export function findMyExtensions(room: Room): StructureExtension[] {
	return (room ? getWithCallback(objectsServerCache, `${room.name}.extensions`, 50, findExtensionsImpl, room) : []) as StructureExtension[];
}
function findExtensionsImpl(room: Room): StructureExtension[] {
	return sortById(room.find(FIND_MY_STRUCTURES).filter(s => isConcreteStructure(s, STRUCTURE_EXTENSION))) as StructureExtension[];
}

export function findMyConstructionSites(room: Room): ConstructionSite[] {
	return (room ? getWithCallback(objectsServerCache, `${room.name}.constructionSites`, 50, findMyConstructionSitesImpl, room) : []) as ConstructionSite[];
}
function findMyConstructionSitesImpl(room: Room): ConstructionSite[] {
	return sortById(room.find(FIND_MY_CONSTRUCTION_SITES));
}

export function findMyStructures(room: Room): AnyOwnedStructure[] {
	return (room ? getWithCallback(objectsServerCache, `${room.name}.myStructures`, 50, findMyStructuresImpl, room) : []) as AnyOwnedStructure[];
}
function findMyStructuresImpl(room: Room): AnyOwnedStructure[] {
	return sortById(room.find(FIND_MY_STRUCTURES));
}

export function findStructures(room: Room): AnyStructure[] {
	return (room ? getWithCallback(objectsServerCache, `${room.name}.structures`, 50, findStructuresImpl, room) : []) as AnyStructure[];
}
function findStructuresImpl(room: Room): AnyStructure[] {
	return sortById(room.find(FIND_STRUCTURES));
}

export function findStructuresByType<T extends StructureConstant>(room: Room, type: T): ConcreteStructure<T>[] {
	return room ? filterStructureType(room.find(FIND_STRUCTURES), type) : [];
}

export type RoomSource = StructureContainer | Source;

export function isRoomSource(s: any): s is RoomSource {
	return s instanceof StructureContainer || s instanceof Source;
}

export function findRoomSource(room: Room): RoomSource {
	let roomSource: RoomSource = tickCacheService.get(`${room.name}.roomSource`);
	if (roomSource) {
		return roomSource;
	}

	let structures = findStructures(room);

	let container = findMaxBy(filterStructureType(structures, STRUCTURE_CONTAINER).filter(s => s.store.getUsedCapacity(RESOURCE_ENERGY)), s => s.store.energy);
	if (container) {
		roomSource = container;
		tickCacheService.set(`${room.name}.roomSource`, roomSource);
		return roomSource;
	}

	let source = findMaxBy(findSources(room).filter(s => s.energy), s => s.energy);
	if (source) {
		roomSource = source;
		tickCacheService.set(`${room.name}.roomSource`, roomSource);
		return roomSource;
	}

	return null;
}

export type RoomSync = StructureSpawn | StructureExtension | StructureContainer;

export function isRoomSync(s: any): s is RoomSync {
	return s instanceof StructureSpawn || s instanceof StructureContainer || s instanceof StructureExtension;
}

export function findRoomSync(room: Room): RoomSync {
	let sync: RoomSync = tickCacheService.get(`${room.name}.roomSync`);
	if (sync) {
		return sync;
	}

	let structures = findStructures(room);
	let spawnOrExt = findMinBy(structures.filter(isSpawnOrExtension).filter(s => s.energy < s.energyCapacity), s => s.energy / s.energyCapacity);
	if (spawnOrExt) {
		sync = spawnOrExt;
		tickCacheService.set(`${room.name}.roomSync`, sync);
		return sync;
	}

	let container = findMinBy(filterStructureType(structures, STRUCTURE_CONTAINER).filter(s => s.store.getFreeCapacity(RESOURCE_ENERGY)), s => s.store.energy);
	if (container) {
		sync = container;
		tickCacheService.set(`${room.name}.roomSync`, sync);
		return sync;
	}

	return null;
}
