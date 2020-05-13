import * as assert from "./assert";
import { tickCacheService, CacheEntrySpec, CacheService, getFromCacheSpec } from "./Cache";
import { ROOM_HEIGHT, ROOM_WIDTH, TERRAIN_PLAIN } from "./constants";
import { isConcreteStructure, isConstructionSiteForStructure } from "./Structure";

// import { isWalkableStructure } from "./util.Structure";

declare global {

	interface RoomPosition {
		_clearance: number;
	}
}

export type RoomPositionMemory = number;

// RoomPosition.prototype.isWalkable = function (): boolean {
// 	return RoomPosition.prototype.lookFor(LOOK_STRUCTURES).every(structure => isWalkableStructure(structure));
// }

const worldSize = Game.map.getWorldSize();
const halfWorld = Math.ceil(worldSize / 2);
const maxWorldCord = worldSize * ROOM_WIDTH;

function roomNameToXY(name: string): [number, number] {
	let match = name.match(/^(\w)(\d+)(\w)(\d+)$/);
	if (!match) {
		throw new Error(`Invalid room name [${name}]`);
	}
	let [, hor, xStr, ver, yStr] = match;
	let x = hor == 'W' ? Number(xStr) + halfWorld : Number(xStr);
	let y = ver == 'N' ? Number(yStr) + halfWorld : Number(yStr);
	return [x, y];
}

function getRoomNameFromXY(x: number, y: number) {
	let xStr = x >= halfWorld ? 'W' + (x - halfWorld) : 'E' + x;
	let yStr = y >= halfWorld ? 'N' + (y - halfWorld) : 'S' + y;
	return xStr + yStr;
}

export function fromMemoryWorld(memory: RoomPositionMemory): RoomPosition {
	assert.ok(_.isNumber(memory));
	let worldY = memory % maxWorldCord;
	let worldX = (memory - worldY) / maxWorldCord;
	let x = worldX % ROOM_WIDTH;
	let roomX = (worldX - x) / ROOM_WIDTH;
	let y = worldY % ROOM_WIDTH;
	let roomY = (worldY - y) / ROOM_WIDTH;
	let roomName = getRoomNameFromXY(roomX, roomY);
	return new RoomPosition(x, y, roomName);
}

export function toMemoryWorld(pos: RoomPosition): RoomPositionMemory {
	assert.instanceOf(pos, RoomPosition);
	let roomXY = roomNameToXY(pos.roomName);
	let worldX = roomXY[0] * ROOM_WIDTH + pos.x;
	let worldY = roomXY[1] * ROOM_WIDTH + pos.y;
	return worldX * maxWorldCord + worldY;
}

export function toMemoryRoom(pos: RoomPosition): RoomPositionMemory {
	assert.instanceOf(pos, RoomPosition);
	return pos.x * ROOM_WIDTH + pos.y;
}

export function fromMemoryRoom(memory: RoomPositionMemory, roomName: string): RoomPosition {
	assert.isNumber(memory);
	assert.isString(roomName);
	let y = memory % ROOM_WIDTH;
	let x = (memory - y) / ROOM_WIDTH;
	return new RoomPosition(x, y, roomName);
}

// RoomPosition.prototype.closest = function (positions: RoomPosition[]): RoomPosition {
// 	return positions.reduce((best, current) => current.getRangeTo(this) < best.getRangeTo(this) ? current : best, positions.first());
// }

export function posNear(center: RoomPosition, includeSelf: boolean): RoomPosition[] {
	let xMin = center.x > 0 ? center.x - 1 : center.x;
	let xMax = center.x < ROOM_WIDTH ? center.x + 1 : center.x;
	let yMin = center.y > 0 ? center.y - 1 : center.y;
	let yMax = center.y < ROOM_HEIGHT ? center.y + 1 : center.y;

	let results: RoomPosition[] = [];
	for (let x = xMin; x <= xMax; x++) {
		for (let y = yMin; y <= yMax; y++) {
			let pos: RoomPosition | null = null;
			if (x == center.x && y == center.y) {
				if (includeSelf) {
					pos = this;
				} else {
					continue;
				}
			}
			results.push(new RoomPosition(x, y, center.roomName));
		}
	}
	return results;
}

export function lookNear<T extends keyof AllLookAtTypes>(
	pos: RoomPosition,
	type: T,
	filter: (element: AllLookAtTypes[T], index?: number) => boolean = _.identity)
	: AllLookAtTypes[T][] {
	return _.flatten(posNear(pos, /*includeSelf=*/true).map((pos: RoomPosition) => pos.lookFor(type).filter(filter)));
}

export function lookNearStructure<T extends StructureConstant>(
	pos: RoomPosition,
	type: T)
	: ConcreteStructure<T>[] {
	return lookNear(pos, LOOK_STRUCTURES, s => isConcreteStructure(s, type)) as ConcreteStructure<T>[];
}

export function lookNearConstruction<T extends BuildableStructureConstant>(
	pos: RoomPosition,
	type: T)
	: ConstructionSite<T>[] {
	return lookNear(pos, LOOK_CONSTRUCTION_SITES, s => isConstructionSiteForStructure(s, type)) as ConstructionSite<T>[];
}

export function getClearance(pos: RoomPosition) {
	return pos._clearance ?? (pos._clearance = (() => {
		return posNear(pos, /*includeSelf=*/false).reduce((count: number, pos: RoomPosition) => {
			return count + Number(pos.lookFor(LOOK_TERRAIN)[0] == TERRAIN_PLAIN);
		}, 0);
	})());
};

export function findObjectByPos<T extends RoomObject & { id: Id<T> }>(
	pos: RoomPosition,
	cacheReader: () => Id<T>,
	cacheWriter: (id: Id<T>) => void,
	findCallback: () => T,
	interval: number = 5): T | RoomPosition | null {
	if (!(pos.roomName in Game.rooms)) {
		return pos;
	}
	let object: T | null = null;
	let id = cacheReader();
	if (id) {
		object = Game.getObjectById(id);
	}
	if (!object && Game.time % interval == 0) {
		object = findCallback();
		cacheWriter(object.id);
	}
	return object;
}

// export function findObjectInRoom<T extends RoomObject & { id: Id<T> }>(
// 	roomName: string,
// 	cacheReader: () => Id<T>,
// 	cacheWriter: (id: Id<T>) => void,
// 	findCallback: (room: Room) => T,
// 	interval: number = 5) {
// 	if (!(roomName in Game.rooms)) {
// 		return null;
// 	}
// 	let object = null;
// 	let id = cacheReader();
// 	if (id) {
// 		object = Game.getObjectById(id);
// 	}
// 	if (!object && Game.time % interval == 0) {
// 		object = findCallback(Game.rooms[roomName]);
// 		cacheWriter(object.id);
// 	}
// 	return object;
// }

// export function findObjectsInRoom<T extends RoomObject & { id: Id<T> }>(
// 	roomName: string,
// 	cacheReader: () => Id<T>[],
// 	cacheWriter: (ids: Id<T>[]) => void,
// 	findCallback: (room: Room) => T[],
// 	interval = 5,
// 	refreshAlways = false) {
// 	if (!(roomName in Game.rooms)) {
// 		return null;
// 	}
// 	let objects = [];
// 	let ids = cacheReader();
// 	if (ids != null && !ids.empty()) {
// 		objects = ids.map(id => Game.getObjectById(id));
// 	}
// 	if ((objects.empty() || refreshAlways) && Game.time % interval == 0) {
// 		objects = findCallback(Game.rooms[roomName]);
// 		cacheWriter(objects.map(o => o.id));
// 	}
// 	return objects;
// }

export function posKey(pos: RoomPosition) {
	return `${pos.roomName}_${pos.x}_${pos.y}`;
}

let nearbyEnergyCache: CacheEntrySpec<Resource<RESOURCE_ENERGY>, RoomPosition> = {
	cache: tickCacheService as CacheService<Resource<RESOURCE_ENERGY>>,
	ttl: 1,
	callback: (pos) => lookNear(pos!, LOOK_ENERGY)[0] ?? null,
};

export function findNearbyEnergy(pos: RoomPosition): Resource<RESOURCE_ENERGY> | undefined {
	return getFromCacheSpec(nearbyEnergyCache, `${posKey(pos)}.nearbyEnergy`, pos) ?? undefined;
}

export function lookForStructureAt<T extends BuildableStructureConstant>(structureType: T, pos: RoomPosition): ConcreteStructure<T> | undefined {
	return pos.lookFor(LOOK_STRUCTURES).find(s => isConcreteStructure(s, structureType)) as ConcreteStructure<T>;
}

export function lookForConstructionAt<T extends BuildableStructureConstant>(structureType: T, pos: RoomPosition): ConstructionSite<T> | undefined {
	return pos.lookFor(LOOK_CONSTRUCTION_SITES).find(s => isConstructionSiteForStructure(s, structureType)) as ConstructionSite<T>;
}
