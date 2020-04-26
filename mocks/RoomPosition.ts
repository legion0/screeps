import { C } from './constants';
import { register } from './Register';
import { runtimeData } from './RuntimeData';
import { fetchXYArguments, getDirection, getRoomNameFromXY, kMaxWorldSize, kMaxWorldSize2, roomNameToXY, _findClosestByPath2 } from './utils';

let abs = Math.abs, min = Math.min, max = Math.max;

class RoomPositionImpl implements Partial<RoomPosition> {
	__packedPos: number;

	constructor(xx: number, yy: number, roomName: string) {
		let xy = roomName === 'sim' ? [-kMaxWorldSize2, -kMaxWorldSize2] : roomNameToXY(roomName);
		xy[0] += kMaxWorldSize2;
		xy[1] += kMaxWorldSize2;
		if (
			xy[0] < 0 || xy[0] > kMaxWorldSize || xy[0] !== xy[0] ||
			xy[1] < 0 || xy[1] > kMaxWorldSize || xy[1] !== xy[1] ||
			xx < 0 || xx > 49 || xx !== xx ||
			yy < 0 || yy > 49 || yy !== yy
		) {
			throw new Error('Invalid arguments in RoomPosition constructor');
		}
		this.__packedPos = xy[0] << 24 | xy[1] << 16 | xx << 8 | yy;
	}

	get x(): number {
		return (this.__packedPos >> 8) & 0xff;
	}

	set x(val: number) {
		if (val < 0 || val > 49 || val !== val) {
			throw new Error('Invalid coordinate');
		}
		this.__packedPos = this.__packedPos & ~(0xff << 8) | val << 8;
	}

	get y(): number {
		return this.__packedPos & 0xff;
	}

	set y(val: number) {
		if (val < 0 || val > 49 || val !== val) {
			throw new Error('Invalid coordinate');
		}
		this.__packedPos = this.__packedPos & ~0xff | val;
	}

	get roomName(): string {
		return getRoomNameFromXY(
			(this.__packedPos >>> 24) - kMaxWorldSize2,
			(this.__packedPos >>> 16 & 0xff) - kMaxWorldSize2
		);
	}

	set roomName(val: string) {
		let xy = val === 'sim' ? [-kMaxWorldSize2, -kMaxWorldSize2] : roomNameToXY(val);
		xy[0] += kMaxWorldSize2;
		xy[1] += kMaxWorldSize2;
		if (
			xy[0] < 0 || xy[0] > kMaxWorldSize || xy[0] !== xy[0] ||
			xy[1] < 0 || xy[1] > kMaxWorldSize || xy[1] !== xy[1]
		) {
			throw new Error('Invalid roomName');
		}
		this.__packedPos = this.__packedPos & ~(0xffff << 16) | xy[0] << 24 | xy[1] << 16;
	}

	toJSON() {
		return {
			x: this.x,
			y: this.y,
			roomName: this.roomName,
		};
	}

	toString() {
		return `[room ${this.roomName} pos ${this.x},${this.y}]`;
	}

	inRangeTo(firstArg, secondArg, thirdArg?) {
		var x = firstArg, y = secondArg, range = thirdArg, roomName = this.roomName;
		if (_.isUndefined(thirdArg)) {
			var pos = firstArg;
			if (pos.pos) {
				pos = pos.pos;
			}
			x = pos.x;
			y = pos.y;
			roomName = pos.roomName;
			range = secondArg;
		}

		return abs(x - this.x) <= range && abs(y - this.y) <= range && roomName == this.roomName;
	}

	isNearTo(firstArg, secondArg?) {
		var [x, y, roomName] = fetchXYArguments(firstArg, secondArg);
		return abs(x - this.x) <= 1 && abs(y - this.y) <= 1 && (!roomName || roomName == this.roomName);
	}

	// { (x: number, y: number): DirectionConstant; (target: RoomPosition | _HasRoomPosition): DirectionConstant; }

	getDirectionTo(firstArg, secondArg?) {
		var [x, y, roomName] = fetchXYArguments(firstArg, secondArg);

		if (!roomName || roomName == this.roomName) {
			return getDirection(x - this.x, y - this.y);
		}

		var [thisRoomX, thisRoomY] = roomNameToXY(this.roomName);
		var [thatRoomX, thatRoomY] = roomNameToXY(roomName);

		return getDirection(thatRoomX * 50 + x - thisRoomX * 50 - this.x, thatRoomY * 50 + y - thisRoomY * 50 - this.y);
	}

	findPathTo(firstArg, secondArg, opts?) {

		var [x, y, roomName] = fetchXYArguments(firstArg, secondArg),
			room = register.rooms[this.roomName];

		if (_.isObject(secondArg)) {
			opts = _.clone(secondArg);
		}
		opts = opts || {};

		roomName = roomName || this.roomName;

		if (!room) {
			throw new Error(`Could not access room ${this.roomName}`);
		}

		if (roomName == this.roomName || register._useNewPathFinder) {
			return room.findPath(this, new RoomPosition(x, y, roomName), opts);
		}
		else {
			var exitDir = room.findExitTo(roomName);
			if (exitDir < 0) {
				return [];
			}
			var exit = this.findClosestByPath(exitDir, opts);
			if (!exit) {
				return [];
			}
			return room.findPath(this, exit, opts);
		}
	}
	findClosestByPath(type, opts) {

		opts = _.clone(opts || {});

		var room = register.rooms[this.roomName];

		if (!room) {
			throw new Error(`Could not access room ${this.roomName}`);
		}

		if (_.isUndefined(type)) {
			return null;
		}

		if (register._useNewPathFinder) {
			return _findClosestByPath2(this, type, opts);
		}

		opts.serialize = false;

		var result = null,
			isNear,
			endNodes = room.getEndNodes(type, opts);

		if (!opts.algorithm) {

			var minH, sumH = 0;

			endNodes.objects.forEach((i) => {
				var x = i.x, y = i.y, roomName = i.roomName;
				if (i.pos) {
					x = i.pos.x;
					y = i.pos.y;
					roomName = i.pos.roomName;
				}
				var h = max(abs(this.x - x), abs(this.y - y));
				if (_.isUndefined(minH) || minH > h) {
					minH = h;
				}
				sumH += h;
			});

			opts.algorithm = sumH > minH * 10 ? 'dijkstra' : 'astar';
		}

		if (opts.algorithm == 'dijkstra') {

			isNear = 1;

			endNodes.objects.forEach((i) => {
				var distance = this.isEqualTo(i) ? -1 :
					this.isNearTo(i) ? 0 : 1;
				if (distance < isNear) {
					result = i;
					isNear = distance;
				}
			});

			if (isNear == 1) {
				var path = room.findPath(this, endNodes.key, opts);
				if (path.length > 0) {
					var lastStep = path[path.length - 1],
						lastStepPos = room.getPositionAt(lastStep.x, lastStep.y);
					result = _.find(endNodes.objects, (i) => lastStepPos.isEqualTo(i));
				}
			}
		}

		if (opts.algorithm == 'astar') {

			endNodes.objects.forEach((i) => {

				var path,
					distance = this.isEqualTo(i) ? -1 :
						this.isNearTo(i) ? 0 :
							(path = this.findPathTo(i, opts)) && path.length > 0 &&
								room.getPositionAt(path[path.length - 1].x, path[path.length - 1].y).isNearTo(i) ?
								path.length : undefined;

				if ((_.isUndefined(isNear) || distance <= isNear) && !_.isUndefined(distance)) {
					isNear = distance;
					result = i;
				}
			});
		}

		return result;
	}
	findInRange(type, range, opts) {
		var room = register.rooms[this.roomName];

		if (!room) {
			throw new Error(`Could not access room ${this.roomName}`);
		}

		opts = _.clone(opts || {});

		var objects = [],
			result = [];

		if (_.isNumber(type)) {
			objects = room.find(type, opts);
		}
		if (_.isArray(type)) {
			objects = opts.filter ? _.filter(type, opts.filter) : type;
		}

		objects.forEach((i) => {
			if (this.inRangeTo(i, range)) {
				result.push(i);
			}
		});

		return result;
	}

	findClosestByRange(type, opts) {
		var room = register.rooms[this.roomName];

		if (!room) {
			throw new Error(`Could not access room ${this.roomName}`);
		}

		opts = _.clone(opts || {});

		var objects = [],
			result = [];

		if (_.isNumber(type)) {
			objects = room.find(type, opts);
		}
		if (_.isArray(type)) {
			objects = opts.filter ? _.filter(type, opts.filter) : type;
		}

		var closest = null, minRange = Infinity;

		objects.forEach((i) => {
			var range = this.getRangeTo(i);
			if (range < minRange) {
				minRange = range;
				closest = i;
			}
		});

		return closest;
	}

	isEqualTo(firstArg, secondArg?) {
		if (firstArg.__packedPos !== undefined) {
			return firstArg.__packedPos === this.__packedPos;
		}
		var [x, y, roomName] = fetchXYArguments(firstArg, secondArg);
		return x == this.x && y == this.y && (!roomName || roomName == this.roomName);
	}

	getRangeTo(firstArg, secondArg?) {
		var [x, y, roomName] = fetchXYArguments(firstArg, secondArg);
		if (roomName && roomName != this.roomName) {
			return Infinity;
		}
		return max(abs(this.x - x), abs(this.y - y));
	}

	look() {
		var room = register.rooms[this.roomName];
		if (!room) {
			throw new Error(`Could not access room ${this.roomName}`);
		}
		return room.lookAt(this);
	}

	lookFor(type) {
		if (type == 'terrain') {
			var terrainCode = runtimeData.staticTerrainData[this.roomName][this.y * 50 + this.x];
			if (terrainCode & C.TERRAIN_MASK_WALL) {
				return ['wall'];
			}
			else if (terrainCode & C.TERRAIN_MASK_SWAMP) {
				return ['swamp'];
			}
			else {
				return ['plain'];
			}
		}
		var room = register.rooms[this.roomName];
		if (!room) {
			throw new Error(`Could not access room ${this.roomName}`);
		}
		return room.lookForAt(type, this);
	}

	createFlag(name, color, secondaryColor) {
		var room = register.rooms[this.roomName];
		if (!room) {
			throw new Error(`Could not access room ${this.roomName}`);
		}
		return room.createFlag(this, name, color, secondaryColor);
	}

	createConstructionSite(structureType, name?) {
		var room = register.rooms[this.roomName];
		if (!room) {
			throw new Error(`Could not access room ${this.roomName}`);
		}
		return room.createConstructionSite(this.x, this.y, structureType, name);
	}
}

export { RoomPositionImpl as RoomPosition }
