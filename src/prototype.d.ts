interface RoomPosition {
	key(): string;
}

interface StructureSpawn {
	spawnCreep2(body: BodyPartConstant[], name: string, opts?: SpawnOptions): ScreepsReturnCode;
	toString2(): string;
}
