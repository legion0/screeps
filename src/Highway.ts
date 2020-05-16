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
	lastUsed?: number;
}

declare global {
	interface Memory {
		highways: { [key: string]: HighwayMemory }
		showHighways?: boolean;
		clearHighways?: boolean;
	}
}

memInit(Memory, 'highways', {});

export class Highway {
	private name: string;

	private from: RoomPosition;

	private to: RoomPosition;

	private memory: HighwayMemory;

	constructor(from: RoomPosition, to: RoomPosition) {
		// Support for reverse coordinates when loading highway while walking backwards
		const reverseName = `highway_${posKey(to)}_${posKey(from)}`;
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
		this.memory = memInit(Memory.highways, this.name, {
			path: [],
			from: toMemoryWorld(this.from),
			to: toMemoryWorld(this.to),
		});
		this.memory.lastUsed = Game.time;
		if (this.memory.path.length) {
			return this;
		}
		log.d(`Attempting to build highway from [${this.from}] to [${this.to}]`);
		const rv = PathFinder.search(this.from, { pos: this.to,
			range: 1 }, {
			plainCost: 1,
			swampCost: 1,
			roomCallback: this.roomCallback,
		});
		if (rv.incomplete) {
			return ERR_NO_PATH;
		}
		const path = rv.path.slice(2, rv.path.length - 2);
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
		if (elapsed(`${this.name}.lastBuild`, 10, false)) {
			this.memory.path
				.map(fromMemoryWorld)
				.filter((pos) => !pos.lookFor(LOOK_STRUCTURES).some(isRoad))
				.filter((pos) => !pos.lookFor(LOOK_CONSTRUCTION_SITES).some(isRoad))
				.forEach((pos) => Game.rooms[pos.roomName].createConstructionSite(pos, STRUCTURE_ROAD));
		}
		return this;
	}

	/*
	 * Clears all construction sites for STRUCTURE_ROAD on the highway path
	 * TODO: make sure we don't remove construction sites and roads not placed by this highway.
	 */
	clearRoad() {
		this.memory.path
			.map(fromMemoryWorld)
			.forEach((pos) => {
				pos.lookFor(LOOK_CONSTRUCTION_SITES)
					.filter((s) => s.structureType === STRUCTURE_ROAD)
					.forEach((s) => s.remove());
				pos.lookFor(LOOK_STRUCTURES)
					.filter((s) => s.structureType === STRUCTURE_ROAD)
					.forEach((s) => s.destroy());
			});
	}

	static findHighway(current: RoomPosition, to: RoomPosition) {
		const range = current.getRangeTo(to);
		const candidates = Object.values(Memory.highways).filter(
			(memory) => fromMemoryWorld(memory.from).getRangeTo(to) <= 5 ||
			fromMemoryWorld(memory.to).getRangeTo(to) <= 5
		);

		for (const memory of candidates) {
			const start = fromMemoryWorld(memory.from);
			const end = fromMemoryWorld(memory.to);
			const onRamp = findMinBy(memory.path.map(fromMemoryWorld),
				(pos) => pos.getRangeTo(current) + pos.getRangeTo(to) / range)!;
			if (onRamp.getRangeTo(current) > 5) {
				continue;
			}
			if (start.getRangeTo(to) < 5) {
				return end;
			} else if (end.getRangeTo(to) < 5) {
				return start;
			}
		}
		return null;
	}

	nextSegment(current: RoomPosition, to: RoomPosition): RoomPosition[] {
		if (!this.memory.path || !this.memory.path.length) {
			log.e(`Accessing Failed Highway at [${this.name}]`);
			return [];
		}
		const highwayPath = this.memory.path.map(fromMemoryWorld);
		const range = current.getRangeTo(to);

		/*
		 * We use range as a tie breaker for positions that are equally far from
		 * the creep, this is important when changing routes between 2 highways
		 * after changing destination.
		 */
		let startIdx = findMinIndexBy(highwayPath, (pos) => pos.getRangeTo(current) + pos.getRangeTo(to) / range);
		let endIdx = findMinIndexBy(highwayPath, to.getRangeTo.bind(to));

		if (startIdx > endIdx) {
			highwayPath.reverse();
			[startIdx, endIdx] = [highwayPath.length - startIdx - 1, highwayPath.length - endIdx - 1];
		}
		// Console.log(startIdx, endIdx, highwayPath.length);
		if (highwayPath[startIdx].isEqualTo(current)) {
			startIdx += 1;
		}
		return highwayPath.slice(startIdx, Math.min(endIdx, startIdx + 5));
	}

	private roomCallback(roomName: string): CostMatrix {
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

// eslint-disable-next-line max-lines-per-function
events.listen(EventEnum.EVENT_TICK_END, () => {
	// Cleanup old unused highways
	everyN(500, () => {
		for (const name of Object.keys(Memory.highways)) {
			const lastUsed = memInit(Memory.highways[name], 'lastUsed', Game.time);
			if (lastUsed + 2000 < Game.time) {
				log.v(`Removing old unused highway [${name}]`);
				Memory.highways[name].path
					.map(fromMemoryWorld)
					.forEach(removeRoads);
				delete Memory.highways[name];
			}
		}
	});

	if (Memory.clearHighways) {
		log.w(`Clearing all highways!`);
		delete Memory.clearHighways;
		for (const [name, highway] of Object.entries(Memory.highways)) {
			highway.path.forEach(removeRoadAtMem);
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

function removeRoads(pos: RoomPosition) {
	if (Game.rooms[pos.roomName]) {
		pos.lookFor(LOOK_CONSTRUCTION_SITES)
			.filter((s) => s.structureType === STRUCTURE_ROAD)
			.forEach((s) => s.remove());
	}
}

function removeRoadAtMem(posMem: RoomPositionMemory) {
	const pos = fromMemoryWorld(posMem);
	if (Game.rooms[pos.roomName]) {
		const road = lookForStructureAt(STRUCTURE_ROAD, pos);
		if (road instanceof ConstructionSite) {
			road.remove();
		} else if (road instanceof StructureRoad) {
			road.destroy();
		}
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
