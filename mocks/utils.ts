import { C } from './constants';
import { driver } from './Driver';
let _ = require('lodash');

let offsetsByDirection = {
	[C.TOP]: [0, -1],
	[C.TOP_RIGHT]: [1, -1],
	[C.RIGHT]: [1, 0],
	[C.BOTTOM_RIGHT]: [1, 1],
	[C.BOTTOM]: [0, 1],
	[C.BOTTOM_LEFT]: [-1, 1],
	[C.LEFT]: [-1, 0],
	[C.TOP_LEFT]: [-1, -1]
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
}

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

export function getOffsetsByDirection(direction) {
	if (!offsetsByDirection[direction]) {
		try {
			throw new Error();
		}
		catch (e) {
			console.error('Wrong move direction', JSON.stringify(direction), JSON.stringify(offsetsByDirection), e.stack);
		}

	}
	return offsetsByDirection[direction];
}

export function calcCreepCost(body) {
	var result = 0;

	body.forEach((i) => {
		if (_.isObject(i)) {
			result += C.BODYPART_COST[(i as any).type];
		}
		else {
			result += C.BODYPART_COST[i];
		}
	});

	return result;
}

export function checkConstructionSite(objects, structureType, x, y) {

	var borderTiles;
	if (structureType != 'road' && structureType != 'container' && (x == 1 || x == 48 || y == 1 || y == 48)) {
		if (x == 1) borderTiles = [[0, y - 1], [0, y], [0, y + 1]];
		if (x == 48) borderTiles = [[49, y - 1], [49, y], [49, y + 1]];
		if (y == 1) borderTiles = [[x - 1, 0], [x, 0], [x + 1, 0]];
		if (y == 48) borderTiles = [[x - 1, 49], [x, 49], [x + 1, 49]];
	}

	if (_.isString(objects) || objects instanceof Uint8Array) {
		if (borderTiles) {
			for (var i in borderTiles) {
				if (!checkTerrain(objects, borderTiles[i][0], borderTiles[i][1], C.TERRAIN_MASK_WALL)) {
					return false;
				}
			}
		}
		if (structureType == 'extractor') {
			return true;
		}
		if (structureType != 'road' && checkTerrain(objects, x, y, C.TERRAIN_MASK_WALL)) {
			return false;
		}
		return true;
	}

	if (objects && _.isArray(objects[0]) && _.isString(objects[0][0])) {
		if (borderTiles) {
			for (var i in borderTiles) {
				if (!(objects[borderTiles[i][1]][borderTiles[i][0]] & C.TERRAIN_MASK_WALL)) {
					return false;
				}
			}
		}
		if (structureType == 'extractor') {
			return true;
		}
		if (structureType != 'road' && objects[y][x] & C.TERRAIN_MASK_WALL) {
			return false;
		}
		return true;
	}

	if (_.some(objects, { x, y, type: structureType })) {
		return false;
	}
	if (_.some(objects, { x, y, type: 'constructionSite' })) {
		return false;
	}
	if (structureType == 'extractor') {
		return _.some(objects, { x, y, type: 'mineral' }) && !_.some(objects, { x, y, type: 'extractor' });
	}
	if (structureType != 'rampart' && structureType != 'road' &&
		_.some(objects, (i) => i.x == x && i.y == y && i.type != 'rampart' && i.type != 'road' && C.CONSTRUCTION_COST[i.type])) {
		return false;
	}
	if (x <= 0 || y <= 0 || x >= 49 || y >= 49) {
		return false;
	}
	return true;
}

export function getDiff(oldData, newData) {

	function getIndex(data) {
		var index = {};
		_.forEach(data, (obj) => index[obj._id] = obj);
		return index;
	}


	var result = {},
		oldIndex = getIndex(oldData),
		newIndex = getIndex(newData);

	_.forEach(oldData, (obj) => {
		if (newIndex[obj._id]) {
			var newObj = newIndex[obj._id];
			var objDiff = result[obj._id] = {};
			for (var key in obj) {
				if (key == '_id') {
					continue;
				}
				if (_.isUndefined(newObj[key])) {
					objDiff[key] = null;
				}
				else if ((typeof obj[key]) != (typeof newObj[key]) || obj[key] && !newObj[key]) {
					objDiff[key] = newObj[key];
				}
				else if (_.isObject(obj[key])) {
					objDiff[key] = {};

					for (var subkey in obj[key]) {
						if (!_.isEqual(obj[key][subkey], newObj[key][subkey])) {
							objDiff[key][subkey] = newObj[key][subkey];
						}
					}
					for (var subkey in newObj[key]) {
						if (_.isUndefined(obj[key][subkey])) {
							objDiff[key][subkey] = newObj[key][subkey];
						}
					}
					if (!_.size(objDiff[key])) {
						delete result[obj._id][key];
					}
				}
				else if (!_.isEqual(obj[key], newObj[key])) {
					objDiff[key] = newObj[key];
				}
			}
			for (var key in newObj) {
				if (_.isUndefined(obj[key])) {
					objDiff[key] = newObj[key];
				}
			}
			if (!_.size(objDiff)) {
				delete result[obj._id];
			}
		}
		else {
			result[obj._id] = null;
		}
	});

	_.forEach(newData, (obj) => {
		if (!oldIndex[obj._id]) {
			result[obj._id] = obj;
		}
	});

	return result;
}

export function encodeTerrain(terrain) {
	var result = '';
	for (var y = 0; y < 50; y++) {
		for (var x = 0; x < 50; x++) {
			var objects = _.filter(terrain, { x, y }),
				code = 0;
			if (_.some(objects, { type: 'wall' })) {
				code = code | C.TERRAIN_MASK_WALL;
			}
			if (_.some(objects, { type: 'swamp' })) {
				code = code | C.TERRAIN_MASK_SWAMP;
			}
			result = result + code;
		}
	}
	return result;
}

export function decodeTerrain(items) {
	var result = [];

	for (var i in items) {
		if (items[i].type != 'terrain') {
			continue;
		}

		for (var y = 0; y < 50; y++) {
			for (var x = 0; x < 50; x++) {
				var code = items[i].terrain.charAt(y * 50 + x);
				if (code & C.TERRAIN_MASK_WALL) {
					result.push({ room: items[i].room, x, y, type: 'wall' });
				}
				if (code & C.TERRAIN_MASK_SWAMP) {
					result.push({ room: items[i].room, x, y, type: 'swamp' });
				}
			}
		}
	}

	return result;
}

export function decodeTerrainByRoom(items) {
	var result = {
		spatial: {}
	};

	for (var i in items) {
		if (items[i].type != 'terrain') {
			continue;
		}
		result[items[i].room] = result[items[i].room] || [];
		result.spatial[items[i].room] = new Array(50);
		for (var y = 0; y < 50; y++) {
			result.spatial[items[i].room][y] = new Array(50);
			for (var x = 0; x < 50; x++) {
				var code = items[i].terrain.charAt(y * 50 + x);
				/*if (code & C.TERRAIN_MASK_WALL) {
						result[items[i].room].push({x, y, type: 'wall'});
				}
				if (code & C.TERRAIN_MASK_SWAMP) {
						result[items[i].room].push({x, y, type: 'swamp'});
				}*/
				result.spatial[items[i].room][y][x] = code;
			}
		}
	}

	return result;
}

export function checkTerrain(terrain, x, y, mask) {
	var code = terrain instanceof Uint8Array ? terrain[y * 50 + x] : Number(terrain.charAt(y * 50 + x));
	return (code & mask) > 0;
}

export function checkControllerAvailability(type, roomObjects, roomController, offset?) {
	var rcl = 0;

	if (roomController && roomController.level && (roomController.user || roomController.owner)) {
		rcl = roomController.level;
	}
	if (_.isNumber(roomController)) {
		rcl = roomController;
	}

	offset = offset || 0;

	var structuresCnt = _(roomObjects).filter((i) => i.type == type || i.type == 'constructionSite' && i.structureType == type).size();
	var availableCnt = C.CONTROLLER_STRUCTURES[type][rcl] + offset;

	return structuresCnt < availableCnt;
}

// Note that game/rooms.js will swap this function out for a faster version, but may call back to
// this function.
export function getRoomNameFromXY(x, y) {
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

export function roomNameToXY(name) {
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
}

export function comparatorDistance(target) {
	if (target.pos) target = target.pos;
	return function (a, b) {
		if (a.pos) a = a.pos;
		if (b.pos) b = b.pos;
		var da = Math.max(Math.abs(a.x - target.x), Math.abs(a.y - target.y));
		var db = Math.max(Math.abs(b.x - target.x), Math.abs(b.y - target.y));
		return da - db;
	}
}

export function storeIntents(userId, userIntents, userRuntimeData) {
	let intents = {} as any;

	for (var i in userIntents) {

		if (i == 'notify') {
			intents.notify = driver.system.sanitizeUserIntents({ notify: userIntents.notify }).notify;
			continue;
		}

		if (i == 'room') {
			driver.system.sanitizeUserRoomIntents(userIntents.room, intents);
			continue;
		}

		if (i == 'global') {
			intents.global = driver.system.sanitizeUserIntents(userIntents.global);
			continue;
		}

		const object = userRuntimeData.userObjects[i] || userRuntimeData.roomObjects[i];
		if (!object) {
			continue;
		}

		intents[object.room] = intents[object.room] || {};
		intents[object.room][i] = driver.system.sanitizeUserIntents(userIntents[i]);

		// for(var iCustomType in driver.config.customIntentTypes) {
		//     if(objectIntentsResult[iCustomType]) {
		//         objectIntents[iCustomType] = {};
		//         for(var prop in driver.config.customIntentTypes[iCustomType]) {
		//             switch(driver.config.customIntentTypes[iCustomType][prop]) {
		//                 case 'string': {
		//                     objectIntents[iCustomType][prop] = "" + objectIntentsResult[iCustomType][prop];
		//                     break;
		//                 }
		//                 case 'number': {
		//                     objectIntents[iCustomType][prop] = +objectIntentsResult[iCustomType][prop];
		//                     break;
		//                 }
		//                 case 'boolean': {
		//                     objectIntents[iCustomType][prop] = !!objectIntentsResult[iCustomType][prop];
		//                     break;
		//                 }
		//             }
		//         }
		//     }
		// }

	}
	return intents;
}

export function sendAttackingNotification(target, roomController) {
	var labelText;
	if (target.type == 'creep') {
		labelText = 'creep ' + target.name;
	}
	else if (target.type == 'spawn') {
		labelText = 'spawn ' + target.name;
	}
	else {
		labelText = `${target.type} #${target._id}`;
	}
	var user = target.user ? target.user : roomController ? roomController.user : null;
	if (user) {
		driver.sendNotification(user, `Your ${labelText} in room ${target.room} is under attack!`);
	}
}

export function checkStructureAgainstController(object, roomObjects, roomController) {
	// owner-less objects are always active
	if (!object.user) {
		return true;
	}

	// eliminate some other easy cases
	if (!roomController || roomController.level < 1 || roomController.user !== object.user) {
		return false;
	}

	let allowedRemaining = C.CONTROLLER_STRUCTURES[object.type][roomController.level];

	if (allowedRemaining === 0) {
		return false;
	}

	// if only one object ever allowed, this is it
	if (C.CONTROLLER_STRUCTURES[object.type][8] === 1) {
		return allowedRemaining !== 0;
	}

	// Scan through the room objects of the same type and count how many are closer.
	let foundSelf = false;
	let objectDist = Math.max(Math.abs(object.x - roomController.x), Math.abs(object.y - roomController.y));
	let objectIds = _.keys(roomObjects);
	for (let i = 0; i < objectIds.length; i++) {
		let compareObj = roomObjects[objectIds[i]];
		if (compareObj.type === object.type && compareObj.user === object.user) {
			let compareDist = Math.max(Math.abs(compareObj.x - roomController.x), Math.abs(compareObj.y - roomController.y));

			if (compareDist < objectDist) {
				allowedRemaining--;
				if (allowedRemaining === 0) {
					return false;
				}
			} else if (!foundSelf && compareDist === objectDist) {
				// Objects of equal distance that are discovered before we scan over the selected object are considered closer
				if (object === compareObj) {
					foundSelf = true;
				} else {
					allowedRemaining--;
					if (allowedRemaining === 0) {
						return false;
					}
				}
			}
		}
	}

	return true;
}

// export function defineGameObjectProperties(obj, dataFn, properties, opts?) {
// 	let propertiesInfo = {};
// 	opts = opts || {};
// 	if (opts.enumerable === undefined) {
// 		opts.enumerable = true;
// 	}

// 	for (let name in properties) {
// 		eval(`
//             propertiesInfo['${name}'] = {
//                 configurable: !!opts.configurable,
//                 enumerable: !!opts.enumerable,
//                 get() {
//                     if(!this['_${name}']) {
//                         this['_${name}'] = properties['${name}'](dataFn(this.id), this.id);
//                     }
//                     return this['_${name}'];
//                 },
//                 set: opts.canSet ? function(value) {
//                     this['_${name}'] = value;
//                 } : undefined

//             }`);
// 	}
// 	Object.defineProperties(obj, propertiesInfo);

// 	obj.toJSON = toJSONMixin;
// }

export class ToJsonMixin {
	toJSON() {
		var result = {};
		for (var i in this) {
			if (i[0] == '_' || _.includes(['toJSON', 'toString'], i)) {
				continue;
			}
			result[i.toString()] = this[i];
		}
		return result;
	}
}

export function applyMixins(derivedCtor: any, baseCtors: any[]) {
	baseCtors.forEach(baseCtor => {
		Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
			Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name));
		});
	});
}

export function toJSONMixin() {
	var result = {};
	for (var i in this) {
		if (i[0] == '_' || _.includes(['toJSON', 'toString'], i)) {
			continue;
		}
		result[i] = this[i];
	}
	return result;
}

export function isAtEdge(object) {
	if (object.pos) {
		object = object.pos;
	}

	return object.x == 0 || object.x == 49 || object.y == 0 || object.y == 49
}

export function serializePath(path) {
	if (!_.isArray(path)) {
		throw new Error('path is not an array');
	}
	var result = '';
	if (!path.length) {
		return result;
	}
	if (path[0].x < 0 || path[0].y < 0) {
		throw new Error('path coordinates cannot be negative');
	}
	result += path[0].x > 9 ? path[0].x : '0' + path[0].x;
	result += path[0].y > 9 ? path[0].y : '0' + path[0].y;

	for (var i = 0; i < path.length; i++) {
		result += path[i].direction;
	}

	return result;
}

export function deserializePath(path) {
	if (!_.isString(path)) {
		throw new Error('`path` is not a string');
	}

	var result = [];
	if (!path.length) {
		return result;
	}
	var x, y, direction, dx, dy;

	x = parseInt(path.substring(0, 2));
	y = parseInt(path.substring(2, 4));
	if (_.isNaN(x) || _.isNaN(y)) {
		throw new Error('`path` is not a valid serialized path string');
	}

	for (var i = 4; i < path.length; i++) {
		direction = parseInt(path.charAt(i));
		if (!offsetsByDirection[direction]) {
			throw new Error('`path` is not a valid serialized path string');
		}
		dx = offsetsByDirection[direction][0];
		dy = offsetsByDirection[direction][1];
		if (i > 4) {
			x += dx;
			y += dy;
		}
		result.push({
			x, y,
			dx, dy,
			direction
		});
	}


	return result;
}

export function calcResources(object) {
	if (object.store) {
		return _.sum(object.store);
	}

	return _.sumBy(C.RESOURCES_ALL, i => typeof object[i] == 'object' ? object[i].amount : (object[i] || 0));
}

export function calcBodyEffectiveness(body, bodyPartType, methodName, basePower, withoutOldHits) {
	var power = 0;
	body.forEach(i => {
		if (!(i.hits || !withoutOldHits && i._oldHits) || i.type != bodyPartType) {
			return;
		}
		var iPower = basePower;
		if (i.boost && C.BOOSTS[bodyPartType][i.boost] && C.BOOSTS[bodyPartType][i.boost][methodName]) {
			iPower *= C.BOOSTS[bodyPartType][i.boost][methodName];
		}
		power += iPower;
	});
	return power;
}

export function dist(a, b) {
	if (a.pos) a = a.pos;
	if (b.pos) b = b.pos;
	return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function calcRoomsDistance(room1, room2, continuous) {
	var [x1, y1] = roomNameToXY(room1);
	var [x2, y2] = roomNameToXY(room2);
	var dx = Math.abs(x2 - x1);
	var dy = Math.abs(y2 - y1);
	if (continuous) {
		var worldSize = driver.getWorldSize();
		dx = Math.min(worldSize - dx, dx);
		dy = Math.min(worldSize - dy, dy);
	}
	return Math.max(dx, dy);
}

export function calcTerminalEnergyCost(amount, range) {
	return Math.ceil(amount * (1 - Math.exp(-range / 30)))
}

export function calcNeededGcl(gclLevel) {
	return C.GCL_MULTIPLY * Math.pow(gclLevel - 1, C.GCL_POW);
}

export function calcTotalReactionsTime(mineral) {
	const reagents = _.reduce(C.REACTIONS, (a: any, n, j) => { _.forEach(n, (k, v) => a[k] = [v, j]); return a; }, {});
	const calcStep = m => !!C.REACTION_TIME[m] ? C.REACTION_TIME[m] + calcStep(reagents[m][0]) + calcStep(reagents[m][1]) : 0;
	return calcStep(mineral);
}

export function capacityForResource(object, resourceType) {
	return object.storeCapacityResource &&
		object.storeCapacityResource[resourceType] ||
		Math.max(0, (object.storeCapacity || 0) - _.sum(object.storeCapacityResource));
}

export function calcReward(resourceDensities, targetDensity, itemsLimit) {
	let resources = [];
	let densities = [];
	_.forEach(resourceDensities, (density, resource) => {
		resources.push(resource);
		densities.push(density);
	});

	let order = _.shuffle(_.range(resources.length));
	if (itemsLimit) {
		order = order.slice(0, itemsLimit);
	}
	let result = _.times(order.length, () => 0);
	let currentDensity = 0;
	for (let i = 0; i < order.length - 1; i++) {
		result[i] = Math.max(0, Math.round(Math.random() * (targetDensity - currentDensity) / densities[order[i]]));
		currentDensity += result[i] * densities[order[i]];
	}
	result[order.length - 1] = Math.max(0, Math.round((targetDensity - currentDensity) / densities[order.length - 1]));

	return _.fromPairs(_.zip(order.map(i => resources[i]), result));
}

export function getReactionVariants(compound) {
	const result = [];
	for (let r1 in C.REACTIONS) {
		for (let r2 in C.REACTIONS[r1]) {
			if (C.REACTIONS[r1][r2] == compound) {
				result.push([r1, r2]);
			}
		}
	}
	return result;
}
