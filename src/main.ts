import { EventEnum, events } from './Events';
import { Job } from './Job';
import { JobBootRoom } from './Job.BootRoom';
import { JobUpgradeController } from './Job.UpgradeController';
import { log } from './Logger';
import { Role } from './Role';
import { serverId } from './ServerCache';
import { MemInit } from "./util";

declare global {
	interface Memory {
		discoveredRooms: string[];
		hardReset: boolean;
	}
}

log.i(`Reloading on server [${serverId}]`);

function main_loop() {
	let discoveredRooms = MemInit(Memory, 'discoveredRooms', {});
	for (let room of Object.values(Game.rooms)) {
		if (!(room.name in discoveredRooms)) {
			events.fire(EventEnum.NEW_ROOM_DISCOVERED, room);
			discoveredRooms[room.name] = null;
		}
		if (room.controller.my) {
			JobBootRoom.create(room);
			JobUpgradeController.create(room.name);
		}
	}
	Job.runAll();
	Role.runAll();
}

module.exports.loop = function () {
	try {
		if (Memory.hardReset) {
			log.w('Initiating hard reset');
			delete Memory.hardReset;
			Memory.rooms = {};
			Memory.creeps = {};
			events.fire(EventEnum.HARD_RESET);
		}
		events.fire(EventEnum.EVENT_TICK_START);
		main_loop();
		events.fire(EventEnum.EVENT_TICK_END);
	} catch (e) {
		console.log(Game.time, 'EXCEPTION', e, e.stack);
		Game.notify(Game.time + ' ' + e.stack);
	}
};
