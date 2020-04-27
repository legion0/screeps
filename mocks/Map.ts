export class Map {
	runtimeData;
	register;
	globals;

	constructor(runtimeData, register, globals) {
		this.runtimeData = runtimeData;
		this.register = register;
		this.globals = globals;
		throw new Error("Method not implemented.");
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
