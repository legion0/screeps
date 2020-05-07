import { EventEnum, events } from './Events';
import { log, getFullStack } from './Logger';
import { MemInit } from "./Memory";
import { detectRespawn } from './reset';
import { serverId } from './ServerCache';
import { Task } from './Task';
import { TaskBootRoom } from './Task.BootRoom';
import { TaskUpgradeController } from './Task.UpgradeController';
import { nextExtensionPos } from './Planning';
import { posKey } from './RoomPosition';
import { ALL } from 'dns';

declare global {
	interface Memory {
		discoveredRooms: string[];
		hardReset: boolean;
		cpu_ema: number;
		cpu_ema_window_size: number;
		cpu_ema_short: number;
		cpu_ema_short_window_size: number;
	}
}

log.i(`Reloading on server [${serverId}]`);

function main_loop() {

	// let all = [];
	// for (let pos of nextExtensionPos(_.find(Game.rooms))) {
	// 	all.push(pos);
	// }

	// Memory['extPos'] = Memory['extPos'] ?? 0;

	// if (Memory['extPos'] < all.length) {
	// 	let pos = all[Memory['extPos']];
	// 	let rv = pos.createFlag(posKey(pos));
	// 	if (!_.isString(rv)) {
	// 		console.log('rv', rv);
	// 	}
	// 	Memory['extPos'] = Memory['extPos'] + 1;
	// } else {
	// 	Memory['extPos'] = 0;
	// 	Object.values(Game.flags).forEach(flag => flag.remove());
	// }

	let discoveredRooms = MemInit(Memory, 'discoveredRooms', {});
	for (let room of Object.values(Game.rooms)) {
		if (!(room.name in discoveredRooms)) {
			events.fire(EventEnum.NEW_ROOM_DISCOVERED, room);
			discoveredRooms[room.name] = null;
		}
		if (room.controller.my) {
			TaskBootRoom.create(room.name);
			TaskUpgradeController.create(room.name);
		}
	}
	Task.runAll();
}

module.exports.loop = function () {
	try {
		if (Memory.hardReset || detectRespawn()) {
			log.w('Respawn detected! Initiating hard reset!');
			events.fire(EventEnum.HARD_RESET);
			delete Memory.hardReset;
			delete Memory.discoveredRooms;
			Memory.rooms = {};
			Memory.creeps = {};
			return;
		}
		events.fire(EventEnum.EVENT_TICK_START);
		main_loop();
		events.fire(EventEnum.EVENT_TICK_END);
		updateCpuEma();
	} catch (e) {
		console.log(Game.time, 'EXCEPTION', e, e.stack);
		Game.notify(Game.time + ' ' + e.stack);
	}
};

function updateCpuEma() {
	let prev_cpu_ema = MemInit(Memory, 'cpu_ema', 0);
	let CPU_EMA_ALPHA = 2 / (MemInit(Memory, 'cpu_ema_window_size', 10000) + 1);
	Memory['cpu_ema'] = CPU_EMA_ALPHA * Game.cpu.getUsed() + (1 - CPU_EMA_ALPHA) * prev_cpu_ema;

	let prev_cpu_ema_short = MemInit(Memory, 'cpu_ema_short', 0);
	let CPU_EMA_SHORT_ALPHA = 2 / (MemInit(Memory, 'cpu_ema_short_window_size', 100) + 1);
	Memory['cpu_ema_short'] = CPU_EMA_SHORT_ALPHA * Game.cpu.getUsed() + (1 - CPU_EMA_SHORT_ALPHA) * prev_cpu_ema_short;

	if (Game.time % 1000 == 0) {
		log.i('CPU:', Memory['cpu_ema_short'].toFixed(2), Memory['cpu_ema'].toFixed(2));
	}
}
