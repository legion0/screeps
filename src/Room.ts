import { findMaxBy, findMinBy } from "./Array";
import { getWithCallback, objectsServerCache, tickCacheService, objectServerCache } from "./Cache";
import { errorCodeToString } from "./constants";
import { EventEnum, events } from "./Events";
import { log } from "./Logger";
import { PriorityQueue } from "./PriorityQueue";
import { posKey, toMemoryWorld, fromMemoryWorld, lookForStructureAt, RoomPositionMemory, posNear } from "./RoomPosition";
import { filterStructureType, isConcreteStructure, isSpawnOrExtension, isWalkableStructure } from "./Structure";
import { everyN } from "./Tick";
import { sortById } from "./util";
import { MemInit } from "./Memory";
import { getUsedCapacity, hasUsedCapacity } from "./Store";

declare global {
	interface RoomMemory {
		constructionQueueSize: number;
	}
}

export enum SpawnQueuePriority {
	UNKNOWN,
	WORKER,
	HAULER,
	HARVESTER,
	BUILDER,
	UPGRADER,
}

export enum BuildQueuePriority {
	UNKNOWN,
	ROAD,
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

export function requestCreepSpawn(room: Room, name: string, callback: (room?: Room, name?: string) => SpawnQueueItem) {
	if (Game.creeps[name]) {
		return ERR_NAME_EXISTS;
	}
	let queue = PriorityQueue.loadOrCreate(Memory.rooms[room.name], 'spawnQueue', spawnQueueCompareFunc, spawnQueueKeyFunc);
	if (queue.hasItem(name)) {
		return ERR_NAME_EXISTS;
	}
	queue.push(callback(room, name));
	return OK;
}

function buildQueueCompareFunc(lhs: BuildQueueItem, rhs: BuildQueueItem): boolean {
	return lhs.priority < rhs.priority;
}

function buildQueueKeyFunc(item: BuildQueueItem): string {
	return item.name;
}

export function requestConstruction(pos: RoomPosition, structureType: BuildableStructureConstant, priority: BuildQueuePriority) {
	let queue = PriorityQueue.loadOrCreate(Memory.rooms[pos.roomName], 'buildQueue', buildQueueCompareFunc, buildQueueKeyFunc);
	let name = posKey(pos) + '_' + structureType;
	if (queue.hasItem(name)) {
		return ERR_NAME_EXISTS;
	}
	if (lookForStructureAt(structureType, pos)) {
		return ERR_FULL;
	}
	queue.push({
		pos: toMemoryWorld(pos),
		structureType: structureType,
		priority: priority,
		name: name,
	});
	MemInit(Memory.rooms[pos.roomName], 'constructionQueueSize', 0);
	Memory.rooms[pos.roomName].constructionQueueSize += CONSTRUCTION_COST[structureType];
	return OK;
}

export function currentConstruction(roomName: string): ConstructionSite<BuildableStructureConstant> {
	let constructionSite = tickCacheService.get(`${roomName}.currentConstruction`) as ConstructionSite;
	if (constructionSite !== undefined) {
		return constructionSite;
	}
	let queue = PriorityQueue.loadOrCreate(Memory.rooms[roomName], 'buildQueue', buildQueueCompareFunc, buildQueueKeyFunc);
	if (queue.isEmpty()) {
		tickCacheService.set(`${roomName}.currentConstruction`, null);
		return null;
	}
	while (!queue.isEmpty()) {
		let item = queue.peek();
		let pos = fromMemoryWorld(item.pos);
		constructionSite = _.find(pos.lookFor(LOOK_CONSTRUCTION_SITES), s => s.my && s.structureType == item.structureType);
		if (constructionSite) {
			break;
		}
		let finishedConstruction = _.find(pos.lookFor(LOOK_STRUCTURES), s => s.structureType == item.structureType);
		if (!finishedConstruction) {
			let rv = pos.createConstructionSite(item.structureType);
			if (rv != OK) {
				log.e(`Failed to create construction [${item.structureType}] at [${pos}]`);
			}
			// TODO: work out better planning to have the construction site placed before the previous one is fully done.
			// e.g. save the current out of the queue and always place the queue peek on so we have the current and next (still better then all).
			constructionSite = null;
			break;
		}
		MemInit(Memory.rooms[roomName], 'constructionQueueSize', 0);
		Memory.rooms[roomName].constructionQueueSize -= CONSTRUCTION_COST[item.structureType];
		queue.pop();
	}
	tickCacheService.set(`${roomName}.currentConstruction`, constructionSite ?? null);
	return constructionSite;
}

export function constructionQueueSize(roomName: string): number {
	return MemInit(Memory.rooms[roomName], 'constructionQueueSize', 0);
}

events.listen(EventEnum.EVENT_TICK_END, () => {
	for (let room of Object.values(Game.rooms)) {
		let queue = PriorityQueue.loadOrCreate(room.memory, 'spawnQueue', spawnQueueCompareFunc, spawnQueueKeyFunc);
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

export type RoomSource = Resource<RESOURCE_ENERGY> | Tombstone | StructureContainer | Source;

export function isRoomSource(s: any): s is RoomSource {
	return s instanceof StructureContainer ||
	s instanceof Source ||
	(s instanceof Resource && s.resourceType == RESOURCE_ENERGY) ||
	(s instanceof Tombstone && s.store.energy > 0);
}

function findRoomSourceImpl(room: Room): RoomSource {
	let structures = findStructures(room);

	let roomSource: RoomSource = null;
	let toombStone = getRecyclePos(room).lookFor(LOOK_TOMBSTONES).find(t => t.store.energy);
	if (toombStone) {
		roomSource = toombStone;
	}

	if (!roomSource) {
		let recycledEnergy = getRecyclePos(room).lookFor(LOOK_ENERGY)[0];
		if (recycledEnergy) {
			roomSource = recycledEnergy;
		}
	}

	if (!roomSource) {
		let container = filterStructureType(structures, STRUCTURE_CONTAINER).filter(s => hasUsedCapacity(s))[0] as StructureContainer;
		if (container) {
			roomSource = container;
		}
	}

	if (!roomSource) {
		let source = findSources(room).filter(s => hasUsedCapacity(s))[0] as Source;
		if (source) {
			roomSource = source;
		}
	}

	return roomSource;
}

export function findRoomSource(room: Room): RoomSource {
	let roomSource = getWithCallback(objectServerCache, `${room.name}.roomSource`, 50, findRoomSourceImpl, room);
	if (!roomSource || !hasUsedCapacity(roomSource)) {
		objectServerCache.clear(`${room.name}.roomSource`);
		return findRoomSource(room);
	}
	return roomSource;
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

export function getRecyclePos(room: Room): RoomPosition {
	let spawns = findMySpawns(room);
	return posNear(spawns[0].pos, false).find(isWalkablePos);
}

function isWalkablePos(pos: RoomPosition): boolean {
	return pos.lookFor(LOOK_STRUCTURES).every(s => isWalkableStructure(s));
}