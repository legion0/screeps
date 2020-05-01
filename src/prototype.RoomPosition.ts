import { ROOM_HEIGHT, ROOM_WIDTH, TERRAIN_PLAIN } from "./constants";
import { isWalkableStructure } from "./util.Structure";

declare global {
	interface RoomPositionMemory extends String { }

	interface RoomPosition {
		key(): string;
		isWalkable(): boolean;
		fromMemory(roomPositionMemory: RoomPositionMemory): RoomPosition;
		toMemory(): RoomPositionMemory;
		closest(positions: RoomPosition[]): RoomPosition;
		// Returns the surrounding room positions without crossing room borders.
		// If the position is near the edge of the map less then 8 positions will be returned.
		posNear(includeSelf: boolean): RoomPosition[];
		// returns the number of adjecent positions with terrain == plain
		getClearance(): number;

		lookNear<T extends keyof AllLookAtTypes>(type: T, filter: (element: AllLookAtTypes[T], index?: number) => boolean): AllLookAtTypes[T][];
	}
}

RoomPosition.prototype.key = function (): string {
	return this.roomName + '_' + this.x + '_' + this.y;
};

RoomPosition.prototype.isWalkable = function (): boolean {
	return RoomPosition.prototype.lookFor(LOOK_STRUCTURES).every(structure => isWalkableStructure(structure));
}

// @static
RoomPosition.prototype.fromMemory = function (memory: RoomPositionMemory): RoomPosition {
	let x = Number(_.trimStart(memory.slice(0, 2), '0'));
	let y = Number(_.trimStart(memory.slice(2, 4), '0'));
	let roomName = memory.slice(4, memory.length);
	return new RoomPosition(x, y, roomName);
}

RoomPosition.prototype.toMemory = function (): RoomPositionMemory {
	return _.padStart(this.x, 2, '0') + _.padStart(this.y, 2, '0') + this.roomName;
}

RoomPosition.prototype.closest = function (positions: RoomPosition[]): RoomPosition {
	return positions.reduce((best, current) => current.getRangeTo(this) < best.getRangeTo(this) ? current : best, positions.first());
}

RoomPosition.prototype.posNear = function (includeSelf: boolean): RoomPosition[] {
	let xMin = this.x > 0 ? this.x - 1 : this.x;
	let xMax = this.x < ROOM_WIDTH ? this.x + 1 : this.x;
	let yMin = this.y > 0 ? this.y - 1 : this.y;
	let yMax = this.y < ROOM_HEIGHT ? this.y + 1 : this.y;

	let results: RoomPosition[] = [];
	for (let x = xMin; x <= xMax; x++) {
		for (let y = yMin; y <= yMax; y++) {
			let pos = null as RoomPosition;
			if (x == this.x && y == this.y) {
				if (includeSelf) {
					pos = this;
				} else {
					continue;
				}
			}
			results.push(new RoomPosition(x, y, this.roomName));
		}
	}
	return results;
}

// lookFor<T extends keyof AllLookAtTypes>(type: T): Array<AllLookAtTypes[T]>;
RoomPosition.prototype.lookNear = function <T extends keyof AllLookAtTypes>(type: AllLookAtTypes[T], filter: (element: AllLookAtTypes[T], index?: number) => boolean) {
	let positions = this.posNear(/*includeSelf=*/true) as RoomPosition[]; positions.push(this);
	return positions.flatMap(pos => pos.lookFor(type).filter(filter));
}

RoomPosition.prototype.getClearance = function () {
	return this._clearance ?? (this._clearance = (() => {
		return this.posNear(/*includeSelf=*/false).reduce((count: number, pos: RoomPosition) => {
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

export function findObjectInRoom<T extends RoomObject & { id: Id<T> }>(
	roomName: string,
	cacheReader: () => Id<T>,
	cacheWriter: (id: Id<T>) => void,
	findCallback: (room: Room) => T,
	interval: number = 5) {
	if (!(roomName in Game.rooms)) {
		return null;
	}
	let object = null;
	let id = cacheReader();
	if (id) {
		object = Game.getObjectById(id);
	}
	if (!object && Game.time % interval == 0) {
		object = findCallback(Game.rooms[roomName]);
		cacheWriter(object.id);
	}
	return object;
}

export function findObjectsInRoom<T extends RoomObject & { id: Id<T> }>(
	roomName: string,
	cacheReader: () => Id<T>[],
	cacheWriter: (ids: Id<T>[]) => void,
	findCallback: (room: Room) => T[],
	interval = 5,
	refreshAlways = false) {
	if (!(roomName in Game.rooms)) {
		return null;
	}
	let objects = [];
	let ids = cacheReader();
	if (ids != null && !ids.empty()) {
		objects = ids.map(id => Game.getObjectById(id));
	}
	if ((objects.empty() || refreshAlways) && Game.time % interval == 0) {
		objects = findCallback(Game.rooms[roomName]);
		cacheWriter(objects.map(o => o.id));
	}
	return objects;
}
