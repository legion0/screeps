import { TERRAIN_PLAIN, ROOM_WIDTH, ROOM_HEIGHT } from "./constants";
import { tickCacheService, getWithCallback } from "./Cache";
import { isConcreteStructure, isRoad } from "./Structure";

// import { isWalkableStructure } from "./util.Structure";

export interface RoomPositionMemory extends String { }

declare global {

	interface RoomPosition {
		_clearance: number;
	}
}

// RoomPosition.prototype.key = function (): string {
// 	return this.roomName + '_' + this.x + '_' + this.y;
// };

// RoomPosition.prototype.isWalkable = function (): boolean {
// 	return RoomPosition.prototype.lookFor(LOOK_STRUCTURES).every(structure => isWalkableStructure(structure));
// }

export function fromMemory(memory: RoomPositionMemory): RoomPosition {
	if (!memory) {
		return undefined;
	}
	let parts = memory.split('_');
	return new RoomPosition(parseInt(parts[1]), parseInt(parts[2]), parts[0]);
}

export function toMemory(pos: RoomPosition): RoomPositionMemory {
	if (pos instanceof RoomPosition) {
		return `${pos.roomName}_${pos.x}_${pos.y}`;
	}
	return null;
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

export function lookForRoad(pos: RoomPosition): StructureRoad | ConstructionSite<STRUCTURE_ROAD> {
	return (pos.lookFor(LOOK_STRUCTURES).filter(isRoad)[0] as StructureRoad) ||
		(pos.lookFor(LOOK_CONSTRUCTION_SITES).filter(isRoad)[0] as ConstructionSite<STRUCTURE_ROAD>);
}
