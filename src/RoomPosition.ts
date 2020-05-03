import { TERRAIN_PLAIN, ROOM_WIDTH, ROOM_HEIGHT } from "./constants";

// import { isWalkableStructure } from "./util.Structure";

declare global {
	// 	interface RoomPositionMemory extends String { }

	interface RoomPosition {
		_clearance: number;
		// 		key(): string;
		// 		isWalkable(): boolean;
		// 		fromMemory(roomPositionMemory: RoomPositionMemory): RoomPosition;
		// 		toMemory(): RoomPositionMemory;
		// 		closest(positions: RoomPosition[]): RoomPosition;
		// 		// Returns the surrounding room positions without crossing room borders.
		// 		// If the position is near the edge of the map less then 8 positions will be returned.
		// 		posNear(includeSelf: boolean): RoomPosition[];
		// 		// returns the number of adjecent positions with terrain == plain
		// 		getClearance(): number;

		// 		lookNear<T extends keyof AllLookAtTypes>(type: T, filter: (element: AllLookAtTypes[T], index?: number) => boolean): AllLookAtTypes[T][];
	}
}

// RoomPosition.prototype.key = function (): string {
// 	return this.roomName + '_' + this.x + '_' + this.y;
// };

// RoomPosition.prototype.isWalkable = function (): boolean {
// 	return RoomPosition.prototype.lookFor(LOOK_STRUCTURES).every(structure => isWalkableStructure(structure));
// }

// // @static
// RoomPosition.prototype.fromMemory = function (memory: RoomPositionMemory): RoomPosition {
// 	let x = Number(_.trimStart(memory.slice(0, 2), '0'));
// 	let y = Number(_.trimStart(memory.slice(2, 4), '0'));
// 	let roomName = memory.slice(4, memory.length);
// 	return new RoomPosition(x, y, roomName);
// }

// RoomPosition.prototype.toMemory = function (): RoomPositionMemory {
// 	return _.padStart(this.x, 2, '0') + _.padStart(this.y, 2, '0') + this.roomName;
// }

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

// // lookFor<T extends keyof AllLookAtTypes>(type: T): Array<AllLookAtTypes[T]>;
// RoomPosition.prototype.lookNear = function <T extends keyof AllLookAtTypes>(type: AllLookAtTypes[T], filter: (element: AllLookAtTypes[T], index?: number) => boolean) {
// 	let positions = this.posNear(/*includeSelf=*/true) as RoomPosition[]; positions.push(this);
// 	return positions.flatMap(pos => pos.lookFor(type).filter(filter));
// }


export function getClearance(pos: RoomPosition) {
	return pos._clearance ?? (pos._clearance = (() => {
		return posNear(pos, /*includeSelf=*/false).reduce((count: number, pos: RoomPosition) => {
			return count + Number(pos.lookFor(LOOK_TERRAIN)[0] == TERRAIN_PLAIN);
		}, 0);
	})());
};

// export function findObjectByPos<T extends RoomObject & { id: Id<T> }>(
// 	pos: RoomPosition,
// 	cacheReader: () => Id<T>,
// 	cacheWriter: (id: Id<T>) => void,
// 	findCallback: () => T,
// 	interval: number = 5) {
// 	if (!(pos.roomName in Game.rooms)) {
// 		return pos;
// 	}
// 	let object = null;
// 	let id = cacheReader();
// 	if (id) {
// 		object = Game.getObjectById(id);
// 	}
// 	if (!object && Game.time % interval == 0) {
// 		object = findCallback();
// 		cacheWriter(object.id);
// 	}
// 	return object;
// }

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
