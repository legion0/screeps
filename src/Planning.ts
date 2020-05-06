import { findMySpawns } from "./Room";

function canBuildExtension(pos: RoomPosition): boolean {
	return !pos.lookFor(LOOK_STRUCTURES).length;
}

export function nextExtensionPos(room: Room) {
	let spawn = findMySpawns(room)[0];
	let pos = spawn.pos;
	let options = [
		[pos.x-1, pos.y-1],
		[pos.x-1, pos.y+1],
		[pos.x+1, pos.y-1],
		[pos.x+1, pos.y+1],
	];
	for (let option of options) {
		pos = new RoomPosition(option[0], option[1], room.name);
		if (canBuildExtension(pos)) {
			console.log(pos);
		}
	}
}
