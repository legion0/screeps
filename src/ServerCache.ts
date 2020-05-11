import { MemInit } from "./Memory";
import { log } from "./Logger";

declare global {
	interface Memory {
		nextServerId: number;
		serverCache: {
			servers: { [key: /*serverId=*/number]: /*lastActive=*/number };
			stableSince: number;
		};
	}
}

MemInit(Memory, 'nextServerId', 0);
export let serverId = Memory.nextServerId++;

MemInit(Memory, 'serverCache', {
	servers: {},
	stableSince: 0,
});

// the expected server count, we will compute the actual one but this is used
// to determine how long to wait for the serve reloads to stabilize.
const EXPECTED_SERVER_COUNT = 3;

export function checkServerCache() {
	if (!(serverId in Memory.serverCache.servers)) {
		log.d(`Server [${serverId}] is joining the server list at [${Game.time}]`);
		Memory.serverCache.stableSince = Game.time;
	}
	Memory.serverCache.servers[serverId] = Game.time;

	for (let [sid, lastActive] of Object.entries(Memory.serverCache.servers)) {
		if (lastActive + 2 * EXPECTED_SERVER_COUNT < Game.time) {
			log.d(`Server [${sid}] appears to be inactive, removing from server list at [${Game.time}]`);
			delete Memory.serverCache.servers[sid];
			Memory.serverCache.stableSince = Game.time;
		}
	}

	let isStable = Memory.serverCache.stableSince + 3 * EXPECTED_SERVER_COUNT < Game.time;
	if (isStable && Memory.serverCache.stableSince + 3 * EXPECTED_SERVER_COUNT + 1 == Game.time) {
		log.d(`Stable servers detected with size [${_.size(Memory.serverCache.servers)}] at time [${Game.time}]`);
	}
}
