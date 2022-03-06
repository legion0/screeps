import { ROOM_HEIGHT, ROOM_WIDTH, TERRAIN_PLAIN, TERRAIN_SWAMP } from './constants';
import { findMyConstructionSites, findMyExtensions, findMySpawns } from './Room';
import { isConstructionSiteForStructure } from './Structure';
import { log } from './Logger';

function canBuildExtension(room: Room, x: number, y: number): boolean {
	const [terrain] = room.lookForAt(LOOK_TERRAIN, x, y);
	return room.lookForAt(LOOK_STRUCTURES, x, y).length === 0 &&
		(terrain === TERRAIN_PLAIN || terrain === TERRAIN_SWAMP);
}

export function* nextExtensionPos(room: Room) {
	const maxExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level];
	if (maxExtensions === 0) {
		return;
	}
	let currentExtensions = findMyExtensions(room).length +
		findMyConstructionSites(room).filter((s) => isConstructionSiteForStructure(s, STRUCTURE_EXTENSION)).length;
	if (currentExtensions >= maxExtensions) {
		return;
	}
	const [spawn] = findMySpawns(room);
	for (const [x, y] of spread(spawn.pos.x, spawn.pos.y)) {
		if (canBuildExtension(room, x, y)) {
			currentExtensions += 1;
			// Console.log(new RoomPosition(x, y, room.name)); log.e(new RoomPosition(x, y, room.name));
			yield new RoomPosition(x, y, room.name);
			if (currentExtensions >= maxExtensions) {
				return;
			}
		}
	}
}

function* spread(x: number, y: number): Generator<[number, number]> {
	const queue: number[] = [];
	const visited: Set<number> = new Set();
	let value = x * ROOM_WIDTH + y;
	queue.push(value);
	visited.add(value);

	while (queue.length) {
		value = queue.shift()!;
		const y2 = value % ROOM_WIDTH;
		const x2 = (value - y2) / ROOM_WIDTH;
		yield [x2, y2];
		for (const [x3, y3] of [[x2 - 1, y2 - 1], [x2 - 1, y2 + 1], [x2 + 1, y2 - 1], [x2 + 1, y2 + 1]]) {
			if (x3 >= 0 && x3 < ROOM_WIDTH && y3 >= 0 && y3 < ROOM_HEIGHT) {
				value = x3 * ROOM_WIDTH + y3;
				if (!visited.has(value)) {
					queue.push(value);
					visited.add(value);
				}
			}
		}
	}
}
