export class Map {
	// Convert a 50X50 grid to a single dimension array expected by Driver.init
	static makeTerrain(grid: number[][]) {
		let terrain: number[] = [];
		for (let xx = 0; xx < 50; ++xx) {
			for (let yy = 0; yy < 50; ++yy) {
				let ii = xx * 50 + yy;
				terrain[ii] = grid[xx][yy];
			}
		}
		return terrain;
	}
}
