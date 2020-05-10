import { getWithCallback, tickCacheService } from "./Cache";
import { ROOM_HEIGHT, ROOM_WIDTH, TERRAIN_PLAIN } from "./constants";
import { isConcreteStructure, isConstructionSiteForStructure } from "./Structure";

// import { isWalkableStructure } from "./util.Structure";

declare global {

	interface RoomPosition {
		_clearance: number;
	}
}

export type RoomPositionMemory = number;

// RoomPosition.prototype.key = function (): string {
// 	return this.roomName + '_' + this.x + '_' + this.y;
// };

// RoomPosition.prototype.isWalkable = function (): boolean {
// 	return RoomPosition.prototype.lookFor(LOOK_STRUCTURES).every(structure => isWalkableStructure(structure));
// }

const worldSize = Game.map.getWorldSize();
const halfWorld = Math.ceil(worldSize / 2);
const maxWorldCord = worldSize * ROOM_WIDTH;

function roomNameToXY(name: string): [number, number] {
	let match = name.match(/^(\w)(\d+)(\w)(\d+)$/);
	if (!match) {
		return null;
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
	if (pos instanceof RoomPosition) {
		let roomXY = roomNameToXY(pos.roomName);
		let worldX = roomXY[0] * ROOM_WIDTH + pos.x;
		let worldY = roomXY[1] * ROOM_WIDTH + pos.y;
		return worldX * maxWorldCord + worldY;
	}
	return null;
}

export function toMemoryRoom(pos: RoomPosition): RoomPositionMemory {
	if (pos instanceof RoomPosition) {
		return pos.x * ROOM_WIDTH + pos.y;
	}
	return null;
}

export function fromMemoryRoom(memory: RoomPositionMemory, roomName: string): RoomPosition {
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
			let pos = null as RoomPosition;
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
	interval: number = 5) {
	if (!(pos.roomName in Game.rooms)) {
		return pos;
	}
	let object = null;
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

export function findNearbyEnergy(pos: RoomPosition) {
	return getWithCallback(tickCacheService, `${posKey(pos)}.nearbyEnergy`, 1, (pos) => lookNear(pos, LOOK_ENERGY)[0], pos);
}

export function lookForStructureAt<T extends BuildableStructureConstant>(structureType: T, pos: RoomPosition): ConcreteStructure<T> | ConstructionSite<T> {
	return (pos.lookFor(LOOK_STRUCTURES).find(s => isConcreteStructure(s, structureType)) as ConcreteStructure<T>) ??
		(pos.lookFor(LOOK_CONSTRUCTION_SITES).find(s => isConstructionSiteForStructure(s, structureType)) as ConstructionSite<T>);
}
