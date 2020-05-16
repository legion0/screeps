import { energyWeb } from './EnergyWeb';
import { EventEnum, events } from './Events';
import { log } from './Logger';
import { memInit } from './Memory';
import { detectRespawn } from './reset';
import { checkServerCache, serverId } from './ServerCache';
import { SpawnQueue } from './SpawnQueue';
import { Task } from './Task';
import { TaskBootRoom } from './Task.BootRoom';


declare global {
	interface Memory {
		discoveredRooms: { [key: string]: null };
		hardReset: boolean;
		cpuEma: number;
		cpuEmaWindowSize: number;
		cpuEmaShort: number;
		cpuEmaShortWindowSize: number;
	}
}

log.d(`Reloading on server [${serverId}]`);

function mainLoop() {
	const discoveredRooms = memInit(Memory, 'discoveredRooms', {});
	for (const room of Object.values(Game.rooms)) {
		if (!(room.name in discoveredRooms)) {
			events.fire(EventEnum.NEW_ROOM_DISCOVERED, room);
			discoveredRooms[room.name] = null;
		}
		if (room.controller && room.controller.my) {
			TaskBootRoom.create(room.name);
		}
	}
	Task.runAll();
	energyWeb.run();
	SpawnQueue.getSpawnQueue().run();
}

module.exports.loop = function loop() {
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
		checkServerCache();
		events.fire(EventEnum.EVENT_TICK_START);
		mainLoop();
		events.fire(EventEnum.EVENT_TICK_END);
		updateCpuEma();
	} catch (e) {
		// eslint-disable-next-line no-console
		console.log(Game.time, 'EXCEPTION', e, e.stack);
		Game.notify(`${Game.time} ${e.stack}`);
	}
};

function updateCpuEma() {
	const prevCpuEma = memInit(Memory, 'cpuEma', 0);
	const CPU_EMA_ALPHA = 2 / (memInit(Memory, 'cpuEmaWindowSize', 10000) + 1);
	Memory.cpuEma = CPU_EMA_ALPHA * Game.cpu.getUsed() + (1 - CPU_EMA_ALPHA) * prevCpuEma;

	const prevCpuEmaShort = memInit(Memory, 'cpuEmaShort', 0);
	const CPU_EMA_SHORT_ALPHA = 2 / (memInit(Memory, 'cpuEmaShortWindowSize', 100) + 1);
	Memory.cpuEmaShort = CPU_EMA_SHORT_ALPHA * Game.cpu.getUsed() + (1 - CPU_EMA_SHORT_ALPHA) * prevCpuEmaShort;

	if (Game.time % 1000 === 0) {
		log.i('CPU:', Memory.cpuEmaShort.toFixed(2), Memory.cpuEma.toFixed(2));
	}
}
