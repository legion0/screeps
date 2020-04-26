interface User {
	_id: string;
}

type TerrainType = TERRAIN_MASK_WALL | TERRAIN_MASK_SWAMP | TERRAIN_MASK_LAVA;

class RuntimeData {
	user: User = { _id: 'mock_id' };

	// map from room name to terrain data
	staticTerrainData: {[key:string]: TerrainType[]} = {};

	userObjects: any[];
}

export let runtimeData = new RuntimeData();
