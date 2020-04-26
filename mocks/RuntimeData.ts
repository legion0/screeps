interface User {
	_id: string;
}

class RuntimeData {
	user: User = { _id: 'mock_id' };
	staticTerrainData: {[key:string]: number[]} = {};
}

export let runtimeData = new RuntimeData();
