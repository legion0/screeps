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

	getObjects<T extends ObjectWithId<T>>(key: string, interval: number, callback: () => T[]) {
		return this.getRaw(key, interval, () => {
			return callback().map(o => o.id);
		}).map((oid: Id<T>) => Game.getObjectById(oid)) as T[];
	}

	getObject<T extends ObjectWithId<T>>(key: string, interval: number, callback: () => T) {
		let id = this.getRaw(key, interval, () => {
			return callback()?.id;
		}) as Id<T>;
		return id ? Game.getObjectById(id) : null;
	}

	private getRaw(key: string, interval: number, callback: Function) {
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
