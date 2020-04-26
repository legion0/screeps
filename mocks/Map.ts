import { generateRoomName } from "./Driver";

function decodeBits(bits: Uint8Array) {
	let terrain: number[] = [];
	for (let xx = 0; xx < 50; ++xx) {
		for (let yy = 0; yy < 50; ++yy) {
			let ii = xx * 50 + yy;
			terrain[ii] = 0x03 & bits[ii] >> ii % 4 * 2;
		}
	}
	return terrain;
}

export class Map {
	// loader for data in for of https://github.com/screeps/driver/blob/v5.0.0/native/sample-terrain.js
	static decodeTerrainData(terrainData) {
		let rooms = [];
		for (let room of terrainData) {
			console.log(generateRoomName(room.room.xx, room.room.yy));
			console.log(Map.prettyMapToString(Map.prettyRoomMap(decodeBits(room.bits))));
			rooms.push({
				room: generateRoomName(room.room.xx, room.room.yy),
				terrain: decodeBits(room.bits)
			});
		}
		return rooms;
	}

	static prettyRoomMap(terrainArr: number[]): number[][] {
		// TERRAIN_MASK_WALL: 1,
		// TERRAIN_MASK_SWAMP: 2,
		// TERRAIN_MASK_LAVA: 4,
		let chars = [' ', 'W', 'S', 'L'];
		let map = Array(50).fill(null).map((u) => Array(50).fill(' '));
		for (let xx = 0; xx < 50; ++xx) {
			for (let yy = 0; yy < 50; ++yy) {
				let ii = xx * 50 + yy;
				let terrain = terrainArr[ii];
				map[xx][yy] = chars[terrain];
			}
		}
		return map;
	}

	static prettyMapToString(prettyMap: number[][]) {
		let outStr = '';
		for (let xx = 0; xx < 50; ++xx) {
			for (let yy = 0; yy < 50; ++yy) {
				outStr += prettyMap[xx][yy];
			}
			outStr += '\n';
		}
		return outStr;
	}
}
