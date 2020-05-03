import { MemInit } from "./Memory";

declare global {
	interface Memory {
		nextServerId: number;
	}
}

interface CacheEntry {
	lastFetch: number;
	value: any;
}

class ServerCache {
	entries: { [key: string]: CacheEntry } = {};

	get(key: string, interval: number, callback: Function) {
		let entry = this.entries[key];
		if (entry && Game.time - entry.lastFetch < interval) {
			return entry.value;
		}

		return (this.entries[key] = {
			lastFetch: Game.time,
			value: callback(),
		}).value;
	}
}

export let serverCache = new ServerCache();

MemInit(Memory, 'nextServerId', 0);
export let serverId = Memory.nextServerId++;
