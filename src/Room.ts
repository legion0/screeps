import { getWithCallback, objectsServerCache } from "./Cache";
import { errorCodeToString } from "./constants";
import { EventEnum, events } from "./Events";
import { log } from "./Logger";
import { PriorityQueue } from "./PriorityQueue";
import { isConcreteStructure } from "./Structure";
import { everyN } from "./Tick";

export enum SpawnQueuePriority {
	WORKER,
	BUILDER,
	UPGRADER,
}

interface SpawnQueueItem {
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

export function requestCreepSpawn(room: Room, name: string, callback: () => SpawnQueueItem) {
	if (Game.creeps[name]) {
		return ERR_NAME_EXISTS;
	}
	let queue = PriorityQueue.loadOrCreate(Memory.rooms[room.name], 'spawnQueue', compareFunc, keyFunc);
	if (queue.hasItem(name)) {
		return ERR_NAME_EXISTS;
	}
	queue.push(callback());
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

function sortById<T extends ObjectWithId<T>>(items: T[]): T[] {
	return _.sortBy(items, s => s.id);
}
