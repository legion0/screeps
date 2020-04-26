import _ from "lodash";
import { register } from "./Register";
import * as utils from "./utils";
import { runtimeData } from "./RuntimeData";
import { C } from "./constants";

let pathfinding = require('@screeps/pathfinding');

let positionsSetCacheCounter = 1;
let privateStore = {};

export class Room {
	name: string;
	gameId: string;
	energyAvailable: number;
	energyCapacityAvailable: number;
	survivalInfo: any;

	constructor(id: string) {
		let gameInfo = null;
		this.name = id;
		this.gameId = id;
		let match = id.match(/survival_(.*)$/);
		if (match) {
			this.gameId = match[1];
		}
		// if(runtimeData.games && gameId in runtimeData.games) {
		// 		gameInfo = runtimeData.games[gameId];
		// }
		this.energyAvailable = 0;
		this.energyCapacityAvailable = 0;
		this.survivalInfo = gameInfo;

		privateStore[id] = {
			pfGrid: {},
			pfFinders: {},
			pfEndNodes: {},
			pfDijkstraFinder: new pathfinding.DijkstraFinder({ diagonalMovement: 1 }),
			pathCache: {},
			positionsSetCache: {

				cache: {},

				key(array: any[]) {

					if (!_.isArray(array)) {
						return 0;
					}

					var positionsArray = _.map(array, (i) => {
						if (i && i.pos) {
							return i.pos;
						}
						if (_.isObject(i) && !_.isUndefined(i.x) && !(i instanceof RoomPosition)) {
							return new RoomPosition(i.x, i.y, id);
						}
						return i;
					});

					var key = _.findKey(this.cache, (objects) => {
						return positionsArray.length == objects.length && _.every(positionsArray, (j) => _.any(objects, (object) => {
							if (!_.isObject(j) || !j.isEqualTo) {
								throw new Error('Invalid position ' + j + ', check your `opts` property');
							}
							return j.isEqualTo(object);
						}));
					});

					if (key === undefined) {
						key = positionsSetCacheCounter++;
						this.cache[key] = _.clone(array);
					}
					else {
						key = parseInt(key);
					}

					return key;
				}
			},
			lookTypeRegisters: {
				creep: register.byRoom[id].creeps,
				energy: register.byRoom[id].energy,
				resource: register.byRoom[id].energy,
				source: register.byRoom[id].sources,
				mineral: register.byRoom[id].minerals,
				deposit: register.byRoom[id].deposits,
				structure: register.byRoom[id].structures,
				flag: register.byRoom[id].flags,
				constructionSite: register.byRoom[id].constructionSites,
				tombstone: register.byRoom[id].tombstones,
				ruin: register.byRoom[id].ruins,
				nuke: register.byRoom[id].nukes,
				powerCreep: register.byRoom[id].powerCreeps
			},
			lookTypeSpatialRegisters: {
				creep: register.byRoom[id].spatial.creeps,
				energy: register.byRoom[id].spatial.energy,
				resource: register.byRoom[id].spatial.energy,
				source: register.byRoom[id].spatial.sources,
				mineral: register.byRoom[id].spatial.minerals,
				deposit: register.byRoom[id].spatial.deposits,
				structure: register.byRoom[id].spatial.structures,
				flag: register.byRoom[id].spatial.flags,
				constructionSite: register.byRoom[id].spatial.constructionSites,
				tombstone: register.byRoom[id].spatial.tombstones,
				ruin: register.byRoom[id].spatial.ruins,
				nuke: register.byRoom[id].spatial.nukes,
				powerCreep: register.byRoom[id].spatial.powerCreeps
			}
		};

		// this.visual = new RoomVisual(id);
	}

	serializePath(path) {
		return utils.serializePath(path);
	}
	deserializePath(str) {
		return utils.deserializePath(str);
	}

	toString() {
		return `[room ${this.name}]`;
	}

	toJSON() {
		var result = {};
		for (var i in this) {
			if (i[0] == '_' || _.includes(['toJSON', 'toString', 'controller', 'storage', 'terminal'], i)) {
				continue;
			}
			result[i] = this[i];
		}
		return result;
	}

	get memory() {
		if (_.isUndefined(Memory.rooms) || Memory.rooms === 'undefined') {
			Memory.rooms = {};
		}
		if (!_.isObject(Memory.rooms)) {
			return undefined;
		}
		return Memory.rooms[this.name] = Memory.rooms[this.name] || {};
	}

	set memory(value) {
		if (_.isUndefined(Memory.rooms) || Memory.rooms === undefined) {
			Memory.rooms = {};
		}
		if (!_.isObject(Memory.rooms)) {
			throw new Error('Could not set room memory');
		}
		Memory.rooms[this.name] = value;
	}

	// getEventLog(raw) {
	// 	if (raw) {
	// 		return runtimeData.roomEventLog[this.name] || '[]';
	// 	}
	// 	let { roomEventLogCache } = register;
	// 	if (!roomEventLogCache[this.name]) {
	// 		roomEventLogCache[this.name] = JSON.parse(runtimeData.roomEventLog[this.name] || '[]');
	// 	}
	// 	return roomEventLogCache[this.name];
	// }

	find(type, opts) {
		var result = [];
		opts = opts || {};
		if (register.findCache[type] && register.findCache[type][this.name]) {
			result = register.findCache[type][this.name];
		}
		else {
			switch (type) {
				case C.FIND_EXIT:
					register.findCache[type] = register.findCache[type] || {};
					register.findCache[type][this.name] = this.find(C.FIND_EXIT_TOP, opts)
						.concat(this.find(C.FIND_EXIT_BOTTOM, opts))
						.concat(this.find(C.FIND_EXIT_RIGHT, opts))
						.concat(this.find(C.FIND_EXIT_LEFT, opts));
					return _.clone(register.findCache[type][this.name]);
				case C.FIND_EXIT_TOP:
				case C.FIND_EXIT_RIGHT:
				case C.FIND_EXIT_BOTTOM:
				case C.FIND_EXIT_LEFT:

					register.findCache[type] = register.findCache[type] || {};

					var exits = [];
					for (var i = 0; i < 50; i++) {
						var x = 0, y = 0;
						if (type == C.FIND_EXIT_LEFT || type == C.FIND_EXIT_RIGHT) {
							y = i;
						}
						else {
							x = i;
						}
						if (type == C.FIND_EXIT_RIGHT) {
							x = 49;
						}
						if (type == C.FIND_EXIT_BOTTOM) {
							y = 49;
						}
						exits.push(!(runtimeData.staticTerrainData[this.name][y * 50 + x] & C.TERRAIN_MASK_WALL));
					}

					result = _.reduce(exits, (accum, i, key) => {
						if (i) {
							if (type == C.FIND_EXIT_TOP) {
								accum.push(this.getPositionAt(key, 0));
							}
							if (type == C.FIND_EXIT_BOTTOM) {
								accum.push(this.getPositionAt(key, 49));
							}
							if (type == C.FIND_EXIT_LEFT) {
								accum.push(this.getPositionAt(0, key));
							}
							if (type == C.FIND_EXIT_RIGHT) {
								accum.push(this.getPositionAt(49, key));
							}
						}
						return accum;
					}, []);

					register.findCache[type][this.name] = result;

					break;
			}
		}

		if (opts.filter) {
			result = _.filter(result, opts.filter);
		}
		else {
			result = _.clone(result);
		}

		return result;
	}

	lookAt(firstArg, secondArg) {
		var [x, y] = utils.fetchXYArguments(firstArg, secondArg, globals),
			result = [];

		_lookSpatialRegister(this.name, C.LOOK_CREEPS, x, y, result);
		_lookSpatialRegister(this.name, C.LOOK_ENERGY, x, y, result);
		_lookSpatialRegister(this.name, C.LOOK_RESOURCES, x, y, result);
		_lookSpatialRegister(this.name, C.LOOK_SOURCES, x, y, result);
		_lookSpatialRegister(this.name, C.LOOK_MINERALS, x, y, result);
		_lookSpatialRegister(this.name, C.LOOK_DEPOSITS, x, y, result);
		_lookSpatialRegister(this.name, C.LOOK_STRUCTURES, x, y, result);
		_lookSpatialRegister(this.name, C.LOOK_FLAGS, x, y, result);
		_lookSpatialRegister(this.name, C.LOOK_CONSTRUCTION_SITES, x, y, result);
		_lookSpatialRegister(this.name, C.LOOK_TERRAIN, x, y, result);
		_lookSpatialRegister(this.name, C.LOOK_NUKES, x, y, result);
		_lookSpatialRegister(this.name, C.LOOK_TOMBSTONES, x, y, result);
		_lookSpatialRegister(this.name, C.LOOK_RUINS, x, y, result);
		_lookSpatialRegister(this.name, C.LOOK_POWER_CREEPS, x, y, result);

		return result;
	}

	lookForAt(type, firstArg, secondArg) {
		var [x, y] = utils.fetchXYArguments(firstArg, secondArg, globals);

		if (type != 'terrain' && !(type in privateStore[this.name].lookTypeSpatialRegisters)) {
			return C.ERR_INVALID_ARGS;
		}

		return _lookSpatialRegister(this.name, type, x, y);
	}

	lookAtArea(top, left, bottom, right, asArray) {

		var result = asArray ? [] : {};

		if (!asArray) {
			for (var y = top; y <= bottom; y++) {
				result[y] = {};
				for (var x = left; x <= right; x++) {
					result[y][x] = [];
				}
			}
		}

		_lookAreaMixedRegister(this.name, C.LOOK_CREEPS, top, left, bottom, right, true, asArray, result);
		_lookAreaMixedRegister(this.name, C.LOOK_ENERGY, top, left, bottom, right, true, asArray, result);
		_lookAreaMixedRegister(this.name, C.LOOK_RESOURCES, top, left, bottom, right, true, asArray, result);
		_lookAreaMixedRegister(this.name, C.LOOK_SOURCES, top, left, bottom, right, true, asArray, result);
		_lookAreaMixedRegister(this.name, C.LOOK_MINERALS, top, left, bottom, right, true, asArray, result);
		_lookAreaMixedRegister(this.name, C.LOOK_DEPOSITS, top, left, bottom, right, true, asArray, result);
		_lookAreaMixedRegister(this.name, C.LOOK_STRUCTURES, top, left, bottom, right, true, asArray, result);
		_lookAreaMixedRegister(this.name, C.LOOK_FLAGS, top, left, bottom, right, true, asArray, result);
		_lookAreaMixedRegister(this.name, C.LOOK_CONSTRUCTION_SITES, top, left, bottom, right, true, asArray, result);
		_lookAreaMixedRegister(this.name, C.LOOK_TERRAIN, top, left, bottom, right, true, asArray, result);
		_lookAreaMixedRegister(this.name, C.LOOK_NUKES, top, left, bottom, right, true, asArray, result);
		_lookAreaMixedRegister(this.name, C.LOOK_TOMBSTONES, top, left, bottom, right, true, asArray, result);
		_lookAreaMixedRegister(this.name, C.LOOK_RUINS, top, left, bottom, right, true, asArray, result);
		_lookAreaMixedRegister(this.name, C.LOOK_POWER_CREEPS, top, left, bottom, right, true, asArray, result);

		return result;
	}

	lookForAtArea(type, top, left, bottom, right, asArray) {

		var result = asArray ? [] : {};

		if (!asArray) {
			for (var y = top; y <= bottom; y++) {
				result[y] = {};
			}
		}

		_lookAreaMixedRegister(this.name, type, top, left, bottom, right, false, asArray, result);

		return result;
	}

	findPath(fromPos, toPos, opts) {

		if (fromPos.roomName != this.name) {
			return opts.serialize ? '' : [];
		}

		if (register._useNewPathFinder) {
			return _findPath2(this.name, fromPos, toPos, opts);
		}

		var fromX = fromPos.x, fromY = fromPos.y,
			path,
			cacheKeySuffix = '';

		opts = _.clone(opts || {});

		if (opts.ignoreCreeps) {
			cacheKeySuffix += '_ignoreCreeps'
		}
		if (opts.ignoreDestructibleStructures) {
			cacheKeySuffix += '_ignoreDestructibleStructures'
		}
		if (opts.avoid) {
			cacheKeySuffix += '_avoid' + privateStore[this.name].positionsSetCache.key(opts.avoid);
		}
		if (opts.ignore) {
			cacheKeySuffix += '_ignore' + privateStore[this.name].positionsSetCache.key(opts.ignore);
		}

		if (_.isNumber(toPos)) {
			if (!privateStore[this.name].pfEndNodes[toPos]) {
				return opts.serialize ? '' : [];
			}

			var grid = getPathfindingGrid(this.name, opts, toPos);

			path = privateStore[this.name].pfDijkstraFinder.findPath(fromX, fromY, -999, -999, grid);
		}
		else {

			if (toPos.roomName != this.name) {
				return opts.serialize ? '' : [];
			}

			var toX = toPos.x, toY = toPos.y,
				cacheKey = `${fromX},${fromY},${toX},${toY}${cacheKeySuffix}`;

			if (privateStore[this.name].pathCache[cacheKey]) {
				return opts.serialize ? utils.serializePath(privateStore[this.name].pathCache[cacheKey]) : _.cloneDeep(privateStore[this.name].pathCache[cacheKey]);
			}

			if (fromX == toX && fromY == toY) {
				return opts.serialize ? '' : [];
			}
			if (fromX < 0 || fromY < 0 || toX < 0 || toY < 0 ||
				fromX >= 50 || fromY >= 50 || toX >= 50 || toY >= 50) {
				return opts.serialize ? '' : [];
			}

			if (abs(fromX - toX) < 2 && abs(fromY - toY) < 2) {
				var result = [{
					x: toX,
					y: toY,
					dx: toX - fromX,
					dy: toY - fromY,
					direction: utils.getDirection(toX - fromX, toY - fromY)
				}];
				return opts.serialize ? utils.serializePath(result) : result;
			}

			var grid = getPathfindingGrid(this.name, opts),
				finder = getPathfinder(this.name, opts);

			grid.setWalkableAt(toX, toY, true);
			path = finder.findPath(fromX, fromY, toX, toY, grid);
		}

		path.splice(0, 1);

		var curX = fromX, curY = fromY;

		var resultPath = _.map(path, (step) => {
			var result = {
				x: step[0],
				y: step[1],
				dx: step[0] - curX,
				dy: step[1] - curY,
				direction: utils.getDirection(step[0] - curX, step[1] - curY)
			};

			curX = result.x;
			curY = result.y;
			return result;
		});

		if (resultPath.length > 0) {
			var lastStep = resultPath[resultPath.length - 1],
				cacheKey = `${fromX},${fromY},${lastStep.x},${lastStep.y}${cacheKeySuffix}`;
			privateStore[this.name].pathCache[cacheKey] = _.cloneDeep(resultPath);
		}

		if (opts.serialize) {
			return utils.serializePath(resultPath);
		}

		return resultPath;
	}

	getPositionAt(x, y) {
		if (x < 0 || x > 49 || y < 0 || y > 49) {
			return null;
		}
		return new RoomPosition(x, y, this.name);
	}

	createFlag(firstArg, secondArg, name, color, secondaryColor) {
		var [x, y] = utils.fetchXYArguments(firstArg, secondArg, globals);

		if (_.isUndefined(x) || _.isUndefined(y) || x < 0 || x > 49 || y < 0 || y > 49) {
			return C.ERR_INVALID_ARGS;
		}
		if (_.size(Game.flags) >= C.FLAGS_LIMIT) {
			return C.ERR_FULL;
		}
		if (_.isObject(firstArg)) {
			secondaryColor = color;
			color = name;
			name = secondArg;
		}
		if (!color) {
			color = C.COLOR_WHITE;
		}
		if (!secondaryColor) {
			secondaryColor = color;
		}
		if (!_.contains(C.COLORS_ALL, color)) {
			return C.ERR_INVALID_ARGS;
		}
		if (!_.contains(C.COLORS_ALL, secondaryColor)) {
			return C.ERR_INVALID_ARGS;
		}
		if (!name) {
			var cnt = 1;
			do {
				name = 'Flag' + cnt;
				cnt++;
			}
			while (_.any(register.flags, { name }) || createdFlagNames.indexOf(name) != -1);
		}
		if (_.any(register.flags, { name }) || createdFlagNames.indexOf(name) != -1) {
			return C.ERR_NAME_EXISTS;
		}
		if (name.length > 60) {
			return C.ERR_INVALID_ARGS;
		}

		createdFlagNames.push(name);

		const roomName = "" + this.name;
		Game.flags[name] = new Flag(name, color, secondaryColor, roomName, x, y);

		intents.pushByName('room', 'createFlag', { roomName, x, y, name, color, secondaryColor });

		return name;
	}

	createConstructionSite(firstArg, secondArg, structureType, name) {
		var [x, y] = utils.fetchXYArguments(firstArg, secondArg, globals);

		if (_.isUndefined(x) || _.isUndefined(y) || x < 0 || x > 49 || y < 0 || y > 49) {
			return C.ERR_INVALID_ARGS;
		}
		if (_.isString(secondArg) && _.isUndefined(structureType)) {
			structureType = secondArg;
		}
		if (!C.CONSTRUCTION_COST[structureType]) {
			return C.ERR_INVALID_ARGS;
		}
		if (structureType == 'spawn' && typeof name == 'string') {
			if (createdSpawnNames.indexOf(name) != -1) {
				return C.ERR_INVALID_ARGS;
			}
			if (_.any(register.spawns, { name }) || _.any(register.constructionSites, { structureType: 'spawn', name })) {
				return C.ERR_INVALID_ARGS;
			}
		}
		if (this.controller && this.controller.level > 0 && !this.controller.my) {
			return C.ERR_NOT_OWNER;
		}
		if (this.controller &&
			this.controller.reservation &&
			register.objectsByRoom[this.name] &&
			register.objectsByRoom[this.name][this.controller.id] &&
			(register.objectsByRoom[this.name][this.controller.id].reservation.user != runtimeData.user._id)) {
			return C.ERR_NOT_OWNER;
		}
		const roomName = "" + this.name;
		if (!utils.checkControllerAvailability(structureType, register.objectsByRoom[this.name], this.controller)) {
			return C.ERR_RCL_NOT_ENOUGH;
		}
		if (!utils.checkConstructionSite(register.objectsByRoom[roomName], structureType, x, y) ||
			!utils.checkConstructionSite(runtimeData.staticTerrainData[roomName], structureType, x, y)) {
			return C.ERR_INVALID_TARGET;
		}

		if (_(runtimeData.userObjects).filter({ type: 'constructionSite' }).size() + createdConstructionSites >= C.MAX_CONSTRUCTION_SITES) {
			return C.ERR_FULL;
		}

		var intent = { roomName, x, y, structureType };

		if (structureType == 'spawn') {
			if (typeof name !== 'string') {
				var cnt = 1;
				do {
					name = "Spawn" + cnt;
					cnt++;
				}
				while (_.any(register.spawns, { name }) ||
				_.any(register.constructionSites, { structureType: 'spawn', name }) ||
					createdSpawnNames.indexOf(name) != -1);
			}
			createdSpawnNames.push(name);
			intent.name = name;
		}

		createdConstructionSites++;

		intents.pushByName('room', 'createConstructionSite', intent);

		return C.OK;
	}

	getEndNodes(type, opts) {
		var key;

		opts = opts || {};

		if (_.isUndefined(type)) {
			throw new Error('Find type cannot be undefined');
		}

		if (!opts.filter && _.isNumber(type)) {
			key = type;
		}
		else {
			if (_.isNumber(type)) {
				type = this.find(type, opts);
			}

			key = privateStore[this.name].positionsSetCache.key(type);

			privateStore[this.name].pfEndNodes[key] = privateStore[this.name].positionsSetCache.cache[key];
		}

		if (!privateStore[this.name].pfEndNodes[key]) {
			privateStore[this.name].pfEndNodes[key] = _.clone(type);
			if (_.isNumber(type)) {
				privateStore[this.name].pfEndNodes[key] = this.find(type, opts);
			}
		}
		return { key, objects: privateStore[this.name].pfEndNodes[key] };
	}

	findExitTo(room) {
		return register.map.findExit(this.name, room);
	}

	getTerrain() {
		return new Room.Terrain(this.name);
	}
}

TerrainConstructor || (()=>{
	for(var roomName in runtimeData.staticTerrainData) {
			var array = runtimeData.staticTerrainData[roomName];
			TerrainConstructor = array.constructor;
			break;
	}
})();

TerrainConstructorSet || (()=>{
	TerrainConstructorSet = TerrainConstructor.prototype.set;
})();


class Terrain {
	constructor(roomName) {
		roomName = "" + roomName;

		const array = (runtimeData.staticTerrainData || {})[roomName];
		if (!array)
			throw new Error(`Could not access room ${roomName}`);
	}
	get(x, y) {
		const value = array[y * 50 + x];
		return (value & C.TERRAIN_MASK_WALL) || (value & C.TERRAIN_MASK_SWAMP) || 0;
	}

	getRawBuffer(destinationArray) {
		if (!!destinationArray) {
			TerrainConstructorSet.call(destinationArray, array);
			return destinationArray;
		}
		return new TerrainConstructor(array);
	}
}

function _lookSpatialRegister(id, typeName, x, y, outArray, withCoords) {

	var item;

	if (typeName == 'terrain') {
		var result = 'plain';
		var terrainCode = runtimeData.staticTerrainData[id][y * 50 + x];
		if (terrainCode & C.TERRAIN_MASK_SWAMP) {
			result = 'swamp';
		}
		if (terrainCode & C.TERRAIN_MASK_WALL) {
			result = 'wall';
		}
		if (outArray) {
			item = { type: 'terrain', terrain: result };
			if (withCoords) {
				item.x = x;
				item.y = y;
			}
			outArray.push(item);
			return;
		}
		return [result];
	}

	if (x < 0 || y < 0 || x > 49 || y > 49) {
		throw new Error('look coords are out of bounds');
	}

	var typeResult = privateStore[id].lookTypeSpatialRegisters[typeName][x * 50 + y];
	if (typeResult) {
		if (outArray) {
			typeResult.forEach((i) => {
				item = { type: typeName };
				item[typeName] = i;
				if (withCoords) {
					item.x = x;
					item.y = y;
				}
				outArray.push(item);
			});
			return;
		}
		return _.clone(typeResult);
	}
	return [];
}

function _lookAreaMixedRegister(id, type, top, left, bottom, right, withType, asArray, result) {
	var typeRegister = privateStore[id].lookTypeRegisters[type],
		keys = typeRegister && Object.keys(typeRegister);

	if (type != 'terrain' && keys.length < (bottom - top + 1) * (right - left + 1)) {

		// by objects

		var checkInside = (i) => {
			return (!i.pos && i.roomName == id || i.pos && i.pos.roomName == id) &&
				i.pos && i.pos.y >= top && i.pos.y <= bottom && i.pos.x >= left && i.pos.x <= right ||
				!i.pos && i.y >= top && i.y <= bottom && i.x >= left && i.x <= right;
		};
		var item;
		keys.forEach((key) => {
			var obj = typeRegister[key];
			if (checkInside(obj)) {
				if (withType) {
					item = { type: type };
					item[type] = obj;
					if (asArray) {
						result.push({ x: obj.x || obj.pos.x, y: obj.y || obj.pos.y, type, [type]: obj });
					}
					else {
						result[obj.y || obj.pos.y][obj.x || obj.pos.x].push(item);
					}
				}
				else {
					if (asArray) {
						result.push({ x: obj.x || obj.pos.x, y: obj.y || obj.pos.y, [type]: obj });
					}
					else {
						result[obj.y || obj.pos.y][obj.x || obj.pos.x] = result[obj.y || obj.pos.y][obj.x || obj.pos.x] || [];
						result[obj.y || obj.pos.y][obj.x || obj.pos.x].push(obj);
					}
				}
			}
		});
	}
	else {

		// spatial

		for (var y = top; y <= bottom; y++) {
			for (var x = left; x <= right; x++) {
				if (asArray) {
					_lookSpatialRegister(id, type, x, y, result, true);
				}
				else {
					if (result[y][x]) {
						_lookSpatialRegister(id, type, x, y, result[y][x]);
					}
					else {
						result[y][x] = _lookSpatialRegister(id, type, x, y, undefined);
					}
				}
			}
		}
	}
}

function getPathfindingGrid2(id, opts) {

	if (!privateStore[id]) {
		return new PathFinder.CostMatrix();
	}

	var gridName = 'grid2';

	opts = opts || {};

	if (opts.ignoreCreeps) {
		gridName += '_ignoreCreeps';
	}
	if (opts.ignoreDestructibleStructures) {
		gridName += '_ignoreDestructibleStructures';
	}
	if (opts.ignoreRoads) {
		gridName += '_ignoreRoads';
	}

	if (!privateStore[id].pfGrid[gridName]) privateStore[id].pfGrid[gridName] = makePathfindingGrid2(id, opts);

	return privateStore[id].pfGrid[gridName];
}

function makePathfindingGrid2(id, opts) {

	opts = opts || {};

	var costs = new PathFinder.CostMatrix();

	var obstacleTypes = _.clone(C.OBSTACLE_OBJECT_TYPES);
	obstacleTypes.push('portal');

	if (opts.ignoreDestructibleStructures) {
		obstacleTypes = _.without(obstacleTypes, 'constructedWall', 'spawn', 'extension', 'link', 'storage', 'observer', 'tower', 'powerBank', 'powerSpawn', 'lab', 'terminal');
	}
	if (opts.ignoreCreeps || register.rooms[id].controller && register.rooms[id].controller.safeMode && register.rooms[id].controller.my) {
		obstacleTypes = _.without(obstacleTypes, 'creep', 'powerCreep');
	}

	if (register.objectsByRoomKeys[id]) {
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
