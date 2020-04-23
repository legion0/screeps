import './prototype.RoomPosition';
import './prototype.StructureSpawn';

function main_loop() {
	for (let room of Object.values(Game.rooms)) {
		if (room.controller.my) {
			// TODO: control room
		}
	}
}

module.exports.loop = function () {
	try {
		main_loop();
	} catch (e) {
		console.log(Game.time, 'EXCEPTION', e, e.stack);
		Game.notify(Game.time + ' ' + e.stack);
	}
};
