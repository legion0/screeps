import { EventEnum, events } from './Events';
import { log } from './Logger';
import { MemInit } from "./Memory";
import { detectRespawn } from './reset';
import { Role } from './Role';
import { serverId } from './ServerCache';
import { Task } from './Task';
import { TaskBootRoom } from './Task.BootRoom';
import { TaskUpgradeController } from './Task.UpgradeController';

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
	// nextExtensionPos(Object.values(Game.rooms)[0]);

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
	Role.runAll();
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

	if (Game.time % 50 == 0) {
		log.i('CPU:', Memory['cpu_ema_short'].toFixed(2), Memory['cpu_ema'].toFixed(2));
	}
}
