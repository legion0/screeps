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
		let ids = this.getRaw(key, interval, () => {
			return callback().map(o => o.id);
		}) as Id<T>[];
		let objects = ids.map((oid: Id<T>) => Game.getObjectById(oid)).filter(_.identity);
		// force a refresh if object count does not match id count
		if (ids.length != objects.length && interval > 0) {
			return this.getObjects(key, /*interval=*/0, callback);
		}
		return objects;
	}

	getObject<T extends ObjectWithId<T>>(key: string, interval: number, callback: () => T) {
		let id: Id<T> = this.getRaw(key, interval, () => {
			return callback()?.id;
		});
		let object = Game.getObjectById(id);
		if (id && !object && interval > 0) {
			return this.getObject(key, /*interval=*/0, callback);
		}
		return object;
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
