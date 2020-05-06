declare global {
	interface Memory {
		initSpawnId: Id<StructureSpawn>;
	}
}

export function detectRespawn(): boolean {
	if (_.size(Game.rooms) == 1) {
		let room = _.find(Game.rooms);
		if (room.controller.level == 1 && room.controller.progress == 0) {
			if (Memory.initSpawnId === undefined || !Game.getObjectById(Memory.initSpawnId)) {
				let spawn = room.find(FIND_MY_SPAWNS)[0];
				Memory.initSpawnId = spawn.id;
				return true;
			}
		}
	}
	return false;
}
