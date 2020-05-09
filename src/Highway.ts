import { findMinIndexBy } from './Array';
import { getWithCallback, objectServerCache } from './Cache';
import { EventEnum, events } from './Events';
import { log } from './Logger';
import { MemInit } from './Memory';
import { fromMemory, posKey, RoomPositionMemory, toMemory } from './RoomPosition';
import { isWalkableStructure, isRoad } from './Structure';
import { everyN } from './Tick';

interface HighwayMemory {
	path: RoomPositionMemory[];
	lastUsed?: number;
}

declare global {
	interface Memory {
		highways: { [key: string]: HighwayMemory }
		showHighways: boolean;
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
			this.from, { pos: this.to, range: 3 },
			{
				plainCost: 1,
				swampCost: 1,
				roomCallback: this.roomCallback,
			}
		);
		if (rv.incomplete) {
			return ERR_NO_PATH;
		}
		let path = rv.path.filter(pos => pos.getRangeTo(this.from) > 3);
		this.memory.path = path.map(toMemory);
		return this;
	}

	show() {
		this.memory.path
			.map(fromMemory)
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
				.map(fromMemory)
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
			.map(fromMemory)
			.forEach(pos => {
				pos.lookFor(LOOK_CONSTRUCTION_SITES)
					.filter(s => s.structureType == STRUCTURE_ROAD)
					.forEach(s => s.remove());
				pos.lookFor(LOOK_STRUCTURES)
					.filter(s => s.structureType == STRUCTURE_ROAD)
					.forEach(s => s.destroy());
			});
	}

	nextSegment(from: RoomPosition, to: RoomPosition): RoomPosition[] {
		if (!this.memory.path || !this.memory.path.length) {
			log.e(`Accessing Failed Highway at [${this.name}]`);
			return [];
		}
		let highwayPath = this.memory.path.map(fromMemory);
		let startIdx = findMinIndexBy(highwayPath, from.getRangeTo.bind(from));
		let endIdx = findMinIndexBy(highwayPath, to.getRangeTo.bind(to));

		if (startIdx > endIdx) {
			highwayPath.reverse();
			[startIdx, endIdx] = [highwayPath.length - startIdx - 1, highwayPath.length - endIdx - 1];
		}
		// console.log(startIdx, endIdx, highwayPath.length);
		if (highwayPath[startIdx].isEqualTo(from)) {
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
					.map(fromMemory)
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
			let path = Memory.highways[name].path.map(fromMemory);
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
});
