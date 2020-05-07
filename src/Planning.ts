import { ROOM_HEIGHT, ROOM_WIDTH, TERRAIN_PLAIN, TERRAIN_SWAMP } from "./constants";
import { findMyExtensions, findMySpawns } from "./Room";

function canBuildExtension(room: Room, x: number, y: number): boolean {
	let terrain = room.lookForAt(LOOK_TERRAIN, x, y)[0];
	return room.lookForAt(LOOK_STRUCTURES, x, y).length == 0 && (terrain == TERRAIN_PLAIN || terrain == TERRAIN_SWAMP);
}

export function* nextExtensionPos(room: Room) {

	let maxExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level];
	if (maxExtensions == 0) {
		return null;
	}
	let currentExtensions = findMyExtensions(room).length;
	if (currentExtensions >= maxExtensions) {
		return;
	}
	let spawn = findMySpawns(room)[0];
	for (let [x, y] of spread(spawn.pos.x, spawn.pos.y)) {
		if (canBuildExtension(room, x, y)) {
			currentExtensions++;
			yield new RoomPosition(x, y, room.name);
			if (currentExtensions >= maxExtensions) {
				return;
			}
		}
	}
}

function* spread(x: number, y: number): Generator<[number, number]> {
	let queue: number[] = [];
	let visited: Set<number> = new Set();
	let value = x * ROOM_WIDTH + y;
	queue.push(value);
	visited.add(value);

	while (queue.length) {
		value = queue.shift();
		let y = value % ROOM_WIDTH;
		let x = (value - y) / ROOM_WIDTH;
		yield [x, y];
		for (let [xi, yi] of [[x - 1, y - 1], [x - 1, y + 1], [x + 1, y - 1], [x + 1, y + 1]]) {
			if (0 <= xi && xi < ROOM_WIDTH && 0 <= yi && yi < ROOM_HEIGHT) {
				value = xi * ROOM_WIDTH + yi;
				if (!visited.has(value)) {
					queue.push(value);
					visited.add(value);
				}
			}
		}
	}
}
