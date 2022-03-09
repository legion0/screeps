import { findMinBy, findMinIndexBy } from './Array';
import { EventEnum, events } from './Events';
import { log } from './Logger';
import { memInit } from './Memory';
import { fromMemoryWorld, lookForStructureAt, posKey, RoomPositionMemory, toMemoryWorld } from './RoomPosition';
import { elapsed } from './ServerCache';
import { isRoad, isWalkableStructure } from './Structure';
import { everyN } from './Tick';

interface HighwayMemory {
	from: RoomPositionMemory;
	to: RoomPositionMemory;
	path: RoomPositionMemory[];
	lastUsed: number;
}

declare global {
	interface Memory {
		highways: { [key: string]: HighwayMemory; };
		showHighways?: boolean;
		clearHighways?: boolean;
	}
}

memInit(Memory, 'highways', {});

function highwayName(from: RoomPosition, to: RoomPosition) {
	return `highway_${posKey(from)}_${posKey(to)}`;
}

// Buffer from target to build highway at.
const HIGHWAY_ROAD_BUFFER = 2;

export const HIGHWAY_RANGE = 5;

const HIGHWAY_SEGMENT_SIZE = 5;

export class Highway {
	private name: string;
	private from: RoomPosition;
	private to: RoomPosition;
	private memory: HighwayMemory;

	private constructor(highwayName: string) {
		this.name = highwayName;
		this.memory = Memory.highways[highwayName];
		this.from = fromMemoryWorld(this.memory.from);
		this.to = fromMemoryWorld(this.memory.to);
	}

	getName(): string {
		return this.name;
	}

	exits() {
		return [this.from, this.to];
	}

	// Returns the `Highway` object for the given `name` or null if not found.
	static loadHighway(name: string): Highway {
		if (name in Memory.highways) {
			return new Highway(name);
		}
		return null;
	}

	// Creates a new `Highway` from `source` to `target`.
	// Returns ERR_NO_PATH if it fails to find a path from `source` to `target`.
	static createHighway(source: RoomPosition, target: RoomPosition) {
		const name = highwayName(source, target);
		if (name in Memory.highways) {
			return new Highway(name);
		}
		return Highway.createNewHighway(source, target);
	}

	// Creates a new `Highway` from `source` to `target`.
	// Returns ERR_NO_PATH if it fails to find a path from `source` to `target`.
	private static createNewHighway(source: RoomPosition, target: RoomPosition): Highway | ScreepsReturnCode {
		log.d(`Creating highway from [${source}] to [${target}]`);
		const name = highwayName(source, target);
		const memory = memInit(Memory.highways, highwayName(source, target), {
			path: [],
			from: toMemoryWorld(source),
			to: toMemoryWorld(target),
			lastUsed: Game.time,
		});
		const rv = PathFinder.search(source, {
			pos: target,
			range: 1
		}, {
			plainCost: 1,
			swampCost: 1,
			roomCallback: Highway.roomCallback,
		});
		if (rv.incomplete) {
			return ERR_NO_PATH;
		}
		const path = rv.path.slice(HIGHWAY_ROAD_BUFFER, rv.path.length - HIGHWAY_ROAD_BUFFER);
		memory.path = path.map(toMemoryWorld);
		Memory.highways[name] = memory;
		return new Highway(name);
	}

	// Returns the `Highway` that will take you from `current` to `target` or
	// null if not found.
	static findHighway(current: RoomPosition, target: RoomPosition) {
		const room = Game.rooms[current.roomName];
		// Find candidates where either end of the highway is in range < 5 to the
		// `target` position.
		const candidates = Object.values(Memory.highways).filter(
			(memory) => fromMemoryWorld(memory.from).getRangeTo(target) <= HIGHWAY_RANGE ||
				fromMemoryWorld(memory.to).getRangeTo(target) <= HIGHWAY_RANGE
		);

		const range = current.getRangeTo(target);

		for (const memory of candidates) {
			const from = fromMemoryWorld(memory.from);
			const to = fromMemoryWorld(memory.to);
			const onRamp = findMinBy(memory.path.map(fromMemoryWorld),
				(pos) => pos.getRangeTo(current) + pos.getRangeTo(target) / range)!;
			if (onRamp.getRangeTo(current) <= HIGHWAY_RANGE) {
				if (Memory.highwayDebugVisuals && room) {
					room.visual.line(current.x, current.y, onRamp.x, onRamp.y, { color: 'green' });
					room.visual.line(onRamp.x, onRamp.y, to.x, to.y, { color: 'green' });
					room.visual.line(from.x, from.y, to.x, to.y, { color: 'blue' });
				}
				return new Highway(highwayName(from, to));
			}
		}
		if (Memory.highwayDebugVisuals && room) {
			room.visual.line(current.x, current.y, target.x, target.y, { color: 'red' });
		}
		return null;
	}

	// Returns the next segment of the highway to walk given the `current` position of the creep.
	// Returns an empty array when reaching the end of the highway.
	nextSegment(current: RoomPosition, target: RoomPosition): RoomPosition[] {
		const highwayPath = this.memory.path.map(fromMemoryWorld);
		this.memory.lastUsed = Game.time;
		const range = current.getRangeTo(target);

		/*
		 * We use range as a tie breaker for positions that are equally far from
		 * the creep, this is important when changing routes between 2 highways
		 * after changing destination.
		 */
		let startIdx = findMinIndexBy(highwayPath, pos => pos.getRangeTo(current) + pos.getRangeTo(target) / range);
		if (startIdx == 0 || startIdx == highwayPath.length - 1) {
			return [];
		}
		let endIdx = findMinIndexBy(highwayPath, pos => pos.getRangeTo(target));

		if (startIdx > endIdx) {
			highwayPath.reverse();
			[startIdx, endIdx] = [highwayPath.length - startIdx - 1, highwayPath.length - endIdx - 1];
		}
		if (highwayPath[startIdx].isEqualTo(current)) {
			++startIdx;
			if (endIdx + 1 < highwayPath.length) {
				++endIdx;
			}
		}
		return highwayPath.slice(startIdx, Math.min(endIdx, startIdx + HIGHWAY_SEGMENT_SIZE));
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
		this.memory.path
			.map(fromMemoryWorld)
			.filter((pos) => !pos.lookFor(LOOK_STRUCTURES).some(isRoad))
			.filter((pos) => !pos.lookFor(LOOK_CONSTRUCTION_SITES).some(isRoad))
			.forEach((pos) => Game.rooms[pos.roomName].createConstructionSite(pos, STRUCTURE_ROAD));
	}

	private static roomCallback(roomName: string): CostMatrix {
		const room = Game.rooms[roomName];

		/*
		 * TODO: handle non visible rooms
		 * option 1: log information about room when room is discovered
		 * option 2: postpone unknown room path calculation until
		 * we are actually in that room building the highway.
		 */
		const costs = new PathFinder.CostMatrix();
		if (!room) {
			return costs;
		}
		room
			.find(FIND_STRUCTURES)
			.filter((structure) => !isWalkableStructure(structure))
			.forEach((structure) => costs.set(structure.pos.x, structure.pos.y, 0xff));
		return costs;
	}
}

events.listen(EventEnum.EVENT_TICK_END, () => {
	// Cleanup old unused highways
	everyN(500, () => {
		for (const [name, memory] of Object.entries(Memory.highways)) {
			const lastUsed = memory.lastUsed;
			if (lastUsed + 2000 < Game.time) {
				log.v(`Removing old unused highway [${name}]`);
				memory.path.map(fromMemoryWorld).forEach(removeRoadConstructionSites);
				delete Memory.highways[name];
			}
		}
	});

	if (Memory.clearHighways) {
		log.w(`Clearing all highways!`);
		delete Memory.clearHighways;
		for (const [name, memory] of Object.entries(Memory.highways)) {
			memory.path.map(fromMemoryWorld).forEach(removeRoadConstructionSites);
			delete Memory.highways[name];
		}
		for (const name of Object.keys(Memory.creeps)) {
			delete Memory.creeps[name].highway;
		}
	}

	if (Memory.showHighways) {
		for (const highway of Object.values(Memory.highways)) {
			const path = highway.path.map(fromMemoryWorld);
			const from = fromMemoryWorld(highway.from);
			const to = fromMemoryWorld(highway.to);

			// TODO: support multi room highway display
			const room = Game.rooms[from.roomName];
			room.visual.poly(path, { stroke: 'yellow' });
			room.visual.line(from.x, from.y, path[0].x, path[0].y, { color: 'yellow' });
			room.visual.line(to.x, to.y, path[path.length - 1].x, path[path.length - 1].y, { color: 'yellow' });
		}
	}
});

function removeRoadConstructionSites(pos: RoomPosition) {
	if (Game.rooms[pos.roomName]) {
		pos.lookFor(LOOK_CONSTRUCTION_SITES)
			.filter((s) => s.structureType === STRUCTURE_ROAD)
			.forEach((s) => s.remove());
	}
}

/*
 * TOP: 1 as DirectionConstant,
 * TOP_RIGHT: 2 as DirectionConstant,
 * RIGHT: 3 as DirectionConstant,
 * BOTTOM_RIGHT: 4 as DirectionConstant,
 * BOTTOM: 5 as DirectionConstant,
 * BOTTOM_LEFT: 6 as DirectionConstant,
 * LEFT: 7 as DirectionConstant,
 * TOP_LEFT: 8 as DirectionConstant,
 */

/*
 * Function serializePath(currentPos: RoomPosition, posPath: RoomPosition[]) {
 * 	if (!currentPos.isNearTo(posPath[0])) {
 * 		return ERR_NO_PATH;
 * 	}
 * 	let prevPos = currentPos;
 * 	let res = '';
 * 	for (let pos of posPath) {
 * 		res += prevPos.getDirectionTo(pos);
 * 		prevPos = pos;
 * 	}
 * 	return res;
 * }
 */

/*
 * Let room = _.find(Game.rooms);
 * let spawn = room.find(FIND_MY_SPAWNS)[0];
 * let path = room.findPath(new RoomPosition(8, 8, room.name), spawn.pos);
 * console.log(JSON.stringify(path));
 * let serialized = Room.serializePath(path);
 * console.log(serialized, typeof (serialized));
 * let deserialized = Room.deserializePath(serialized);
 * console.log(JSON.stringify(deserialized));
 */

/*
 * Let room = _.find(Game.rooms);
 * let spawn = room.find(FIND_MY_SPAWNS)[0];
 * let controller = room.controller;
 * let path = room.findPath(spawn.pos, controller.pos);
 * console.log(JSON.stringify(path));
 * let serialized = Room.serializePath(path);
 * console.log(serialized, typeof (serialized));
 * let deserialized = Room.deserializePath(serialized);
 * console.log(JSON.stringify(deserialized));
 */

/*
 * [
 * 	{ "x": 29, "y": 17, "dx": 0, "dy": 1, "direction": 5 },
 * 	{ "x": 30, "y": 18, "dx": 1, "dy": 1, "direction": 4 },
 * 	{ "x": 31, "y": 19, "dx": 1, "dy": 1, "direction": 4 },
 * 	{ "x": 32, "y": 20, "dx": 1, "dy": 1, "direction": 4 },
 * 	{ "x": 32, "y": 21, "dx": 0, "dy": 1, "direction": 5 },
 * 	{ "x": 32, "y": 22, "dx": 0, "dy": 1, "direction": 5 },
 * 	{ "x": 32, "y": 23, "dx": 0, "dy": 1, "direction": 5 },
 * 	{ "x": 31, "y": 24, "dx": -1, "dy": 1, "direction": 6 },
 * 	{ "x": 30, "y": 25, "dx": -1, "dy": 1, "direction": 6 },
 * 	{ "x": 29, "y": 26, "dx": -1, "dy": 1, "direction": 6 },
 * 	{ "x": 29, "y": 27, "dx": 0, "dy": 1, "direction": 5 },
 * 	{ "x": 28, "y": 28, "dx": -1, "dy": 1, "direction": 6 },
 * 	{ "x": 27, "y": 28, "dx": -1, "dy": 0, "direction": 7 },
 * 	{ "x": 26, "y": 29, "dx": -1, "dy": 1, "direction": 6 },
 * 	{ "x": 25, "y": 30, "dx": -1, "dy": 1, "direction": 6 },
 * 	{ "x": 24, "y": 31, "dx": -1, "dy": 1, "direction": 6 },
 * 	{ "x": 24, "y": 32, "dx": 0, "dy": 1, "direction": 5 },
 * 	{ "x": 24, "y": 33, "dx": 0, "dy": 1, "direction": 5 },
 * 	{ "x": 24, "y": 34, "dx": 0, "dy": 1, "direction": 5 },
 * 	{ "x": 24, "y": 35, "dx": 0, "dy": 1, "direction": 5 },
 * 	{ "x": 24, "y": 36, "dx": 0, "dy": 1, "direction": 5 },
 * 	{ "x": 24, "y": 37, "dx": 0, "dy": 1, "direction": 5 },
 * 	{ "x": 24, "y": 38, "dx": 0, "dy": 1, "direction": 5 },
 * 	{ "x": 23, "y": 39, "dx": -1, "dy": 1, "direction": 6 },
 * 	{ "x": 22, "y": 40, "dx": -1, "dy": 1, "direction": 6 },
 * 	{ "x": 22, "y": 41, "dx": 0, "dy": 1, "direction": 5 },
 * 	{ "x": 23, "y": 42, "dx": 1, "dy": 1, "direction": 4 }
 * ]
 * 2917544455566656766655555556654
 */
