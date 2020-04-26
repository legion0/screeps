import './prototype.All';

import { events, EventEnum } from './Events';

function main_loop() {
	for (let room of Object.values(Game.rooms)) {
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
