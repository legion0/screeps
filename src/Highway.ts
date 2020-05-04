// import { EventEnum, events } from './Events';
// import { MemInit } from './Memory';
// import { isWalkableStructure } from './util.Structure';

// interface HighwayMemory {
// 	path: RoomPositionMemory[];
// }

// declare global {
// 	interface Memory {
// 		highways: { [key: string]: HighwayMemory }
// 	}
// }

// export class Highway {
// 	private name: string;
// 	private from: RoomPosition;
// 	private to: RoomPosition;
// 	private memory: HighwayMemory;

// 	constructor(from: RoomPosition, to: RoomPosition) {
// 		MemInit(Memory, 'highways', {});
// 		// support for reverse coordinates when loading highway while walking backwards
// 		let reverseName = `highway_${to.key()}_${from.key()}`;
// 		if (reverseName in Memory.highways) {
// 			[to, from] = [from, to];
// 		}
// 		this.name = `highway_${from.key()}_${to.key()}`;
// 		this.from = from;
// 		this.to = to;
// 		this.memory = MemInit(Memory.highways, this.name, {});
// 	}

// 	build(): Highway | ScreepsReturnCode {
// 		let rv = PathFinder.search(
// 			this.from, { pos: this.to, range: 1 },
// 			{
// 				plainCost: 1,
// 				swampCost: 1,
// 				roomCallback: this.roomCallback,
// 			}
// 		);
// 		if (rv.incomplete) {
// 			return ERR_NO_PATH;
// 		}
// 		this.memory.path = rv.path.map(pos => pos.toMemory());
// 		return this;
// 	}

// 	show() {
// 		this.memory.path
// 			.map(RoomPosition.prototype.fromMemory)
// 			.forEach((pos, idx) => pos.createFlag(`${this.name}_${idx}`));
// 	}

// 	hide() {
// 		this.memory.path
// 			.forEach((_, idx) => Game.flags[`${this.name}_${idx}`]?.remove());
// 	}

// 	remove() {
// 		this.hide();
// 		delete Memory.highways[this.name];
// 	}

// 	buildRoad(): ScreepsReturnCode {
// 		return this.memory.path
// 			.map(RoomPosition.prototype.fromMemory)
// 			.filter(pos => pos.lookFor(LOOK_STRUCTURES).some(s => s.structureType == STRUCTURE_ROAD))
// 			.filter(pos => pos.lookFor(LOOK_CONSTRUCTION_SITES).some(s => s.structureType == STRUCTURE_ROAD))
// 			.map(pos => Game.rooms[pos.roomName].createConstructionSite(pos, STRUCTURE_ROAD))
// 			.find(rv => rv != OK) ?? OK;
// 	}

// 	// Clears all construction sites for STRUCTURE_ROAD on the highway path
// 	// TODO: make sure we don't remove construction sites and roads not placed by this highway.
// 	clearRoad() {
// 		this.memory.path
// 			.map(RoomPosition.prototype.fromMemory)
// 			.forEach(pos => {
// 				pos.lookFor(LOOK_CONSTRUCTION_SITES)
// 					.filter(s => s.structureType == STRUCTURE_ROAD)
// 					.forEach(s => s.remove());
// 				pos.lookFor(LOOK_STRUCTURES)
// 					.filter(s => s.structureType == STRUCTURE_ROAD)
// 					.forEach(s => s.destroy());
// 			});
// 	}

// 	nextSegment(from: RoomPosition, to: RoomPosition): RoomPosition[] {
// 		let highwayPath = this.memory.path
// 			.map(RoomPosition.prototype.fromMemory);
// 		let startIdx = highwayPath.findMinIndex(from.getRangeTo.bind(from));
// 		let endIdx = highwayPath.findMinIndex(to.getRangeTo.bind(to));

// 		if (startIdx > endIdx) {
// 			highwayPath.reverse();
// 			[startIdx, endIdx] = [highwayPath.size() - startIdx - 1, highwayPath.size() - endIdx - 1];
// 		}
// 		if (highwayPath[startIdx].isEqualTo(from)) {
// 			startIdx++;
// 		}
// 		return highwayPath.slice(startIdx, Math.min(endIdx, startIdx + 3));
// 	}

// 	private roomCallback(roomName: string) {
// 		let room = Game.rooms[roomName];
// 		// TODO: handle non visible rooms
// 		// option 1: log information about room when room is discovered
// 		// option 2: postpone unknown room path calculation until
// 		// we are actually in that room building the highway.
// 		if (!room) {
// 			return;
// 		}
// 		let costs = new PathFinder.CostMatrix;
// 		room
// 			.find(FIND_STRUCTURES)
// 			.filter(structure => !isWalkableStructure(structure))
// 			.forEach(structure => costs.set(structure.pos.x, structure.pos.y, 0xff));
// 		return costs;
// 	}
// }

// events.listen(EventEnum.EVENT_TICK_END, () => {
// 	if (Game.flags.highway_begin && Game.flags.highway_end) {
// 		new Highway(Game.flags.highway_begin.pos, Game.flags.highway_end.pos).build();
// 		Game.flags.highway_begin.remove();
// 		Game.flags.highway_end.remove();
// 	}
// });
