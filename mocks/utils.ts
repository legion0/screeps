import { C } from './constants';
import { register } from './Register';
import { runtimeData } from './RuntimeData';
import { PathFinder } from './PathFinder';

export const kMaxWorldSize = 256;
export const kMaxWorldSize2 = kMaxWorldSize >> 1;

let privateStore = {};

export function getRoomNameFromXY(x: number | string, y: number | string) {
	if (x < 0) {
		x = 'W' + (-x - 1);
	}
	else {
		x = 'E' + (x);
	}
	if (y < 0) {
		y = 'N' + (-y - 1);
	}
	else {
		y = 'S' + (y);
	}
	return "" + x + y;
}

export function roomNameToXY(name: string): number[] {
	let xx = parseInt(name.substr(1), 10);
	let verticalPos = 2;
	if (xx >= 100) {
		verticalPos = 4;
	} else if (xx >= 10) {
		verticalPos = 3;
	}
	let yy = parseInt(name.substr(verticalPos + 1), 10);
	let horizontalDir = name.charAt(0);
	let verticalDir = name.charAt(verticalPos);
	if (horizontalDir === 'W' || horizontalDir === 'w') {
		xx = -xx - 1;
	}
	if (verticalDir === 'N' || verticalDir === 'n') {
		yy = -yy - 1;
	}
	return [xx, yy];
};

function hasPos(o: any): o is { pos: RoomPosition } {
	return o.pos && o.pos instanceof RoomPosition;
}

export function fetchXYArguments(firstArg: RoomPosition | { pos: RoomPosition } | number, secondArg?: number): [number, number, string] {
	let x: number, y: number, roomName: string;
	if (_.isUndefined(secondArg) || !_.isNumber(secondArg)) {
		if (!_.isObject(firstArg)) {
			return [undefined, undefined, undefined];
		}

		if (firstArg instanceof RoomPosition) {
			x = firstArg.x;
			y = firstArg.y;
			roomName = firstArg.roomName;
		}
		if (hasPos(firstArg)) {
			x = firstArg.pos.x;
			y = firstArg.pos.y;
			roomName = firstArg.pos.roomName;
		}
	}
	else {
		x = firstArg as number;
		y = secondArg;
	}
	if (_.isNaN(x)) {
		x = undefined;
	}
	if (_.isNaN(y)) {
		y = undefined;
	}
	return [x, y, roomName];
};

export function getDirection(dx, dy) {

	var adx = Math.abs(dx), ady = Math.abs(dy);

	if (adx > ady * 2) {
		if (dx > 0) {
			return C.RIGHT;
		}
		else {
			return C.LEFT;
		}
	}
	else if (ady > adx * 2) {
		if (dy > 0) {
			return C.BOTTOM;
		}
		else {
			return C.TOP;
		}
	}
	else {
		if (dx > 0 && dy > 0) {
			return C.BOTTOM_RIGHT;
		}
		if (dx > 0 && dy < 0) {
			return C.TOP_RIGHT;
		}
		if (dx < 0 && dy > 0) {
			return C.BOTTOM_LEFT;
		}
		if (dx < 0 && dy < 0) {
			return C.TOP_LEFT;
		}
	}
}

export function _findClosestByPath2(fromPos, objects, opts) {

	opts = opts || {};

	if (_.isNumber(objects)) {
		objects = register.rooms[fromPos.roomName].find(objects, { filter: opts.filter });
	}
	else if (opts.filter) {
		objects = _.filter(objects, opts.filter);
	}

	if (!objects.length) {
		return null;
	}

	var objectOnSquare = _.find(objects, obj => fromPos.isEqualTo(obj));
	if (objectOnSquare) {
		return objectOnSquare;
	}

	var goals = _.map(objects, i => {
		if (i.pos) {
			i = i.pos;
		}
		return { range: 1, pos: i };
	});

	if (opts.avoid) {
		register.deprecated('`avoid` option cannot be used when `PathFinder.use()` is enabled. Use `costCallback` instead.');
	}
	if (opts.ignore) {
		register.deprecated('`ignore` option cannot be used when `PathFinder.use()` is enabled. Use `costCallback` instead.');
	}
	let searchOpts: PathFinderOpts = {
		roomCallback: function (roomName) {
			if (register.objectsByRoom[roomName]) {
				var costMatrix = getPathfindingGrid2(roomName, opts);
				if (typeof opts.costCallback == 'function') {
					costMatrix = costMatrix.clone();
					var resultMatrix = opts.costCallback(roomName, costMatrix);
					if (resultMatrix instanceof PathFinder.CostMatrix) {
						costMatrix = resultMatrix;
					}
				}
				return costMatrix;
			}
		},
		maxOps: opts.maxOps,
		maxRooms: 1
	};
	if (!opts.ignoreRoads) {
		searchOpts.plainCost = 2;
		searchOpts.swampCost = 10;
	}
	var ret = PathFinder.search(fromPos, goals, searchOpts);

	var result = null;
	var lastPos = fromPos;

	if (ret.path.length) {
		lastPos = ret.path[ret.path.length - 1];
	}

	objects.forEach(obj => {
		if (lastPos.isNearTo(obj)) {
			result = obj;
		}
	});

	return result;
}

function getPathfindingGrid2(id, opts) {

	if(!privateStore[id]) {
			return new PathFinder.CostMatrix();
	}

	var gridName = 'grid2';

	opts = opts || {};

	if(opts.ignoreCreeps) {
			gridName += '_ignoreCreeps';
	}
	if(opts.ignoreDestructibleStructures) {
			gridName += '_ignoreDestructibleStructures';
	}
	if(opts.ignoreRoads) {
			gridName += '_ignoreRoads';
	}

	if(!privateStore[id].pfGrid[gridName]) privateStore[id].pfGrid[gridName] = makePathfindingGrid2(id, opts);

	return privateStore[id].pfGrid[gridName];
}

function makePathfindingGrid2(id, opts) {

	opts = opts || {};

	var costs = new PathFinder.CostMatrix();

	var obstacleTypes = _.clone(C.OBSTACLE_OBJECT_TYPES);
	obstacleTypes.push('portal');

	if(opts.ignoreDestructibleStructures) {
			obstacleTypes = _.without(obstacleTypes, 'constructedWall','spawn','extension', 'link','storage','observer','tower','powerBank','powerSpawn','lab','terminal');
	}
	if(opts.ignoreCreeps || register.rooms[id].controller && register.rooms[id].controller.safeMode && register.rooms[id].controller.my) {
			obstacleTypes = _.without(obstacleTypes, 'creep', 'powerCreep');
	}

	if(register.objectsByRoomKeys[id]) {
			register.objectsByRoomKeys[id].forEach((key) => {
					var object = register.objectsByRoom[id][key];

					if (_.includes(obstacleTypes, object.type) ||
					!opts.ignoreCreeps && register.rooms[id].controller && register.rooms[id].controller.safeMode && register.rooms[id].controller.my && (object.type == 'creep' || object.type == 'powerCreep') && object.user == runtimeData.user._id ||
					!opts.ignoreDestructibleStructures && object.type == 'rampart' && !object.isPublic && object.user != runtimeData.user._id ||
					!opts.ignoreDestructibleStructures && object.type == 'constructionSite' && object.user == runtimeData.user._id && _.includes(C.OBSTACLE_OBJECT_TYPES, object.structureType)) {

							costs.set(object.x, object.y, 0xFF);
					}

					if (object.type == 'swamp' && costs.get(object.x, object.y) == 0) {
							costs.set(object.x, object.y, opts.ignoreRoads ? 5 : 10);
					}

					if (!opts.ignoreRoads && object.type == 'road' && costs.get(object.x, object.y) < 0xFF) {
							costs.set(object.x, object.y, 1);
					}
			});
	}

	return costs;
}
