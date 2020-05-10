import { findMinIndexBy } from './Array';
import { getWithCallback, objectServerCache } from './Cache';
import { EventEnum, events } from './Events';
import { log } from './Logger';
import { MemInit } from './Memory';
import { fromMemoryWorld, posKey, toMemoryWorld, lookForStructureAt, RoomPositionMemory } from './RoomPosition';
import { isWalkableStructure, isRoad } from './Structure';
import { everyN } from './Tick';

interface HighwayMemory {
	path: RoomPositionMemory[];
	lastUsed?: number;
}

declare global {
	interface Memory {
		highways: { [key: string]: HighwayMemory }
		showHighways?: boolean;
		clearHighways?: boolean;
	}
}

MemInit(Memory, 'highways', {});

export class Highway {
	private name: string;
	private from: RoomPosition;
	private to: RoomPosition;
	private memory: HighwayMemory;

	constructor(from: RoomPosition, to: RoomPosition) {
		// support for reverse coordinates when loading highway while walking backwards
		let reverseName = `highway_${posKey(to)}_${posKey(from)}`;
		if (reverseName in Memory.highways) {
			[to, from] = [from, to];
		}
		this.name = `highway_${posKey(from)}_${posKey(to)}`;
		this.from = from;
		this.to = to;
	}

	build(): Highway | ScreepsReturnCode {
		if (this.from.getRangeTo(this.to) < 10) {
			return ERR_FULL;
		}
		this.memory = MemInit(Memory.highways, this.name, {});
		this.memory.lastUsed = Game.time;
		if (this.memory.path) {
			return this;
		}
		let rv = PathFinder.search(
			this.from, { pos: this.to, range: 1 },
			{
				plainCost: 1,
				swampCost: 1,
				roomCallback: this.roomCallback,
			}
		);
		if (rv.incomplete) {
			return ERR_NO_PATH;
		}
		let path = rv.path.slice(2, rv.path.length - 2);
		this.memory.path = path.map(toMemoryWorld);
		return this;
	}

	show() {
		this.memory.path
			.map(fromMemoryWorld)
			.forEach((pos, idx) => pos.createFlag(`${this.name}_${idx}`));
	}

	hide() {
		this.memory.path
			.forEach((_, idx) => Game.flags[`${this.name}_${idx}`]?.remove());
	}

	remove() {
		this.hide();
		delete Memory.highways[this.name];
	}

	buildRoad() {
		getWithCallback(objectServerCache, `${this.name}.roads`, 100, () => {
			// log.d(`Building roads for [${this.name}]`);
			this.memory.path
				.map(fromMemoryWorld)
				.filter(pos => !pos.lookFor(LOOK_STRUCTURES).some(isRoad))
				.filter(pos => !pos.lookFor(LOOK_CONSTRUCTION_SITES).some(isRoad))
				.forEach(pos => Game.rooms[pos.roomName].createConstructionSite(pos, STRUCTURE_ROAD));
			return null;
		});
		return this;
	}

	// Clears all construction sites for STRUCTURE_ROAD on the highway path
	// TODO: make sure we don't remove construction sites and roads not placed by this highway.
	clearRoad() {
		this.memory.path
			.map(fromMemoryWorld)
			.forEach(pos => {
				pos.lookFor(LOOK_CONSTRUCTION_SITES)
					.filter(s => s.structureType == STRUCTURE_ROAD)
					.forEach(s => s.remove());
				pos.lookFor(LOOK_STRUCTURES)
					.filter(s => s.structureType == STRUCTURE_ROAD)
					.forEach(s => s.destroy());
			});
	}

	nextSegment(current: RoomPosition, to: RoomPosition): RoomPosition[] {
		if (!this.memory.path || !this.memory.path.length) {
			log.e(`Accessing Failed Highway at [${this.name}]`);
			return [];
		}
		let highwayPath = this.memory.path.map(fromMemoryWorld);
		let range = current.getRangeTo(to);
		// we use range as a tie breaker for positions that are equally far from
		// the creep, this is important when changing routes between 2 highways
		// after changing destination.
		let startIdx = findMinIndexBy(highwayPath, pos => pos.getRangeTo(current) + pos.getRangeTo(to) / range);
		let endIdx = findMinIndexBy(highwayPath, to.getRangeTo.bind(to));

		if (startIdx > endIdx) {
			highwayPath.reverse();
			[startIdx, endIdx] = [highwayPath.length - startIdx - 1, highwayPath.length - endIdx - 1];
		}
		// console.log(startIdx, endIdx, highwayPath.length);
		if (highwayPath[startIdx].isEqualTo(current)) {
			startIdx++;
		}
		return highwayPath.slice(startIdx, Math.min(endIdx, startIdx + 5));
	}

	private roomCallback(roomName: string) {
		let room = Game.rooms[roomName];
		// TODO: handle non visible rooms
		// option 1: log information about room when room is discovered
		// option 2: postpone unknown room path calculation until
		// we are actually in that room building the highway.
		if (!room) {
			return;
		}
		let costs = new PathFinder.CostMatrix;
		room
			.find(FIND_STRUCTURES)
			.filter(structure => !isWalkableStructure(structure))
			.forEach(structure => costs.set(structure.pos.x, structure.pos.y, 0xff));
		return costs;
	}
}

events.listen(EventEnum.EVENT_TICK_END, () => {
	if (Game.flags.highway_begin && Game.flags.highway_end) {
		new Highway(Game.flags.highway_begin.pos, Game.flags.highway_end.pos).build();
		Game.flags.highway_begin.remove();
		Game.flags.highway_end.remove();
	}
	// cleanup old unused highways
	everyN(500, () => {
		for (let name in Memory.highways) {
			let lastUsed = MemInit(Memory.highways[name], 'lastUsed', Game.time);
			if (lastUsed + 2000 < Game.time) {
				log.v(`Removing old unused highway [${name}]`);
				Memory.highways[name].path
					.map(fromMemoryWorld)
					.forEach(pos => {
						pos.lookFor(LOOK_CONSTRUCTION_SITES)
							.filter(s => s.structureType == STRUCTURE_ROAD)
							.forEach(s => s.remove());
					});
				delete Memory.highways[name];
			}
		}
	});

	if (Memory.showHighways) {
		for (let name in Memory.highways) {
			let path = Memory.highways[name].path.map(fromMemoryWorld);
			let room = Game.rooms[path[0].roomName];
			room.visual.poly(path, { stroke: 'yellow' });
		}

		// let allPos: RoomPosition[] = [];
		// for (let name in Memory.highways) {
		// 	Memory.highways[name].path.forEach(pos => allPos.push(fromMemory(pos)));
		// }
		// let room = Game.rooms[allPos[0].roomName];
		// room.find(FIND_CONSTRUCTION_SITES).filter(s => !allPos.some(other => s.pos.isEqualTo(other))).forEach(s => s.remove());
		// room.find(FIND_STRUCTURES).filter(isRoad).filter(s => !allPos.some(other => s.pos.isEqualTo(other))).forEach(s => s.destroy());
	}

	if (Memory.clearHighways) {
		log.w(`Clearing all highways!`);
		delete Memory.clearHighways;
		for (let name in Memory.highways) {
			Memory.highways[name].path.forEach(posMem => {
				let pos = fromMemoryWorld(posMem);
				let road = lookForStructureAt(STRUCTURE_ROAD, pos);
				if (road instanceof ConstructionSite) {
					road.remove();
				} else if (road instanceof StructureRoad) {
					road.destroy();
				}
			});
			delete Memory.highways[name];
		}
		for (let name in Memory.creeps) {
			delete Memory.creeps[name].highway;
		}
	}
});

// TOP: 1 as DirectionConstant,
// TOP_RIGHT: 2 as DirectionConstant,
// RIGHT: 3 as DirectionConstant,
// BOTTOM_RIGHT: 4 as DirectionConstant,
// BOTTOM: 5 as DirectionConstant,
// BOTTOM_LEFT: 6 as DirectionConstant,
// LEFT: 7 as DirectionConstant,
// TOP_LEFT: 8 as DirectionConstant,

// function serializePath(currentPos: RoomPosition, posPath: RoomPosition[]) {
// 	if (!currentPos.isNearTo(posPath[0])) {
// 		return ERR_NO_PATH;
// 	}
// 	let prevPos = currentPos;
// 	let res = '';
// 	for (let pos of posPath) {
// 		res += prevPos.getDirectionTo(pos);
// 		prevPos = pos;
// 	}
// 	return res;
// }

let room = _.find(Game.rooms);
let spawn = room.find(FIND_MY_SPAWNS)[0];
let path = room.findPath(new RoomPosition(8, 8, room.name), spawn.pos);
console.log(JSON.stringify(path));
let serialized = Room.serializePath(path);
console.log(serialized, typeof (serialized));
let deserialized = Room.deserializePath(serialized);
console.log(JSON.stringify(deserialized));

// let room = _.find(Game.rooms);
// let spawn = room.find(FIND_MY_SPAWNS)[0];
// let controller = room.controller;
// let path = room.findPath(spawn.pos, controller.pos);
// console.log(JSON.stringify(path));
// let serialized = Room.serializePath(path);
// console.log(serialized, typeof (serialized));
// let deserialized = Room.deserializePath(serialized);
// console.log(JSON.stringify(deserialized));

// [
// 	{ "x": 29, "y": 17, "dx": 0, "dy": 1, "direction": 5 },
// 	{ "x": 30, "y": 18, "dx": 1, "dy": 1, "direction": 4 },
// 	{ "x": 31, "y": 19, "dx": 1, "dy": 1, "direction": 4 },
// 	{ "x": 32, "y": 20, "dx": 1, "dy": 1, "direction": 4 },
// 	{ "x": 32, "y": 21, "dx": 0, "dy": 1, "direction": 5 },
// 	{ "x": 32, "y": 22, "dx": 0, "dy": 1, "direction": 5 },
// 	{ "x": 32, "y": 23, "dx": 0, "dy": 1, "direction": 5 },
// 	{ "x": 31, "y": 24, "dx": -1, "dy": 1, "direction": 6 },
// 	{ "x": 30, "y": 25, "dx": -1, "dy": 1, "direction": 6 },
// 	{ "x": 29, "y": 26, "dx": -1, "dy": 1, "direction": 6 },
// 	{ "x": 29, "y": 27, "dx": 0, "dy": 1, "direction": 5 },
// 	{ "x": 28, "y": 28, "dx": -1, "dy": 1, "direction": 6 },
// 	{ "x": 27, "y": 28, "dx": -1, "dy": 0, "direction": 7 },
// 	{ "x": 26, "y": 29, "dx": -1, "dy": 1, "direction": 6 },
// 	{ "x": 25, "y": 30, "dx": -1, "dy": 1, "direction": 6 },
// 	{ "x": 24, "y": 31, "dx": -1, "dy": 1, "direction": 6 },
// 	{ "x": 24, "y": 32, "dx": 0, "dy": 1, "direction": 5 },
// 	{ "x": 24, "y": 33, "dx": 0, "dy": 1, "direction": 5 },
// 	{ "x": 24, "y": 34, "dx": 0, "dy": 1, "direction": 5 },
// 	{ "x": 24, "y": 35, "dx": 0, "dy": 1, "direction": 5 },
// 	{ "x": 24, "y": 36, "dx": 0, "dy": 1, "direction": 5 },
// 	{ "x": 24, "y": 37, "dx": 0, "dy": 1, "direction": 5 },
// 	{ "x": 24, "y": 38, "dx": 0, "dy": 1, "direction": 5 },
// 	{ "x": 23, "y": 39, "dx": -1, "dy": 1, "direction": 6 },
// 	{ "x": 22, "y": 40, "dx": -1, "dy": 1, "direction": 6 },
// 	{ "x": 22, "y": 41, "dx": 0, "dy": 1, "direction": 5 },
// 	{ "x": 23, "y": 42, "dx": 1, "dy": 1, "direction": 4 }
// ]
// 2917544455566656766655555556654