type TerrainType = TERRAIN_MASK_WALL | TERRAIN_MASK_SWAMP | TERRAIN_MASK_LAVA;

class RuntimeData {
	user = { _id: 'mock_id', gcl: 0, power: 0, cpu: 0, subscriptionTokens: 0 };

	// map from room name to terrain data
	staticTerrainData: {[key:string]: TerrainType[]} = {};

	userObjects: {};

	time: number;

	cpu: number;

	cpuBucket: number;

	roomObjects: {};

	rooms: {};

	userPowerCreeps: {};

	flags: any[];
}

export let runtimeData = new RuntimeData();
