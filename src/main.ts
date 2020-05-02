import './prototype.All';

import { events, EventEnum } from './Events';
import { MemInit } from './Memory';

declare global {
	interface Memory {
		discoveredRooms: string[];
	}
}

function main_loop() {
	let discoveredRooms = MemInit(Memory, 'discoveredRooms', {});
	for (let room of Object.values(Game.rooms)) {
		if (!(room.name in discoveredRooms)) {
			events.fire(EventEnum.NEW_ROOM_DISCOVERED, room);
			discoveredRooms[room.name] = null;
		}
		if (room.controller.my) {
			// TODO: control room
		}
	}
}

module.exports.loop = function () {
	try {
		events.fire(EventEnum.EVENT_TICK_START);
		main_loop();
		events.fire(EventEnum.EVENT_TICK_END);
	} catch (e) {
		console.log(Game.time, 'EXCEPTION', e, e.stack);
		Game.notify(Game.time + ' ' + e.stack);
	}
};
