declare global {
	interface RoomMemory {
		initSpawnId: Id<StructureSpawn>;
	}
}

export function detectRespawn(): boolean {
	if (_.size(Game.rooms) == 1) {
		let room = _.find(Game.rooms);
		if (room.controller.level == 1 && room.controller.progress == 0) {
			return detectRespawn2(room);
		}
	}
	return false;
}

function detectRespawn2(room: Room): boolean {
	let initSpawnId = room.memory.initSpawnId;
	if (initSpawnId === undefined) {
		let spawn = room.find(FIND_MY_SPAWNS)[0];
		if (spawn) {
			room.memory.initSpawnId = spawn.id;
			return true;
		}
	} else if (!Game.getObjectById(initSpawnId)) {
		delete room.memory.initSpawnId;
		return detectRespawn2(room);
	}
	return false;
}
