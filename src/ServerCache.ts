import { MemInit } from "./Memory";

declare global {
	interface Memory {
		nextServerId: number;
	}
}

MemInit(Memory, 'nextServerId', 0);
export let serverId = Memory.nextServerId++;
