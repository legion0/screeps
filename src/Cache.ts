// TODO: move trim operations to event tick end

import { getFullStack, log } from "./Logger";
import { threadId } from "worker_threads";

export interface CacheService<T> {
	// returns the value from the cache or undefined if value is not in the cache or expired.
	get(id: string): T;
	set(id: string, value: T, ttl: number): void;
	clear(id: string): void;
}

export class ObjectCacheService<T> implements CacheService<T> {
	private cache: { [key: string]: { insertTime: number, value: T, ttl: number } };

	constructor(obj: { [key: string]: any }) {
		this.cache = obj;
	}

	get(id: string): T {
		let entry = this.cache[id];
		return entry && (Game.time - entry.insertTime < entry.ttl) ? entry.value : undefined;
	}

	clear(id: string): void {
		delete this.cache[id];
	}

	set(id: string, value: T, ttl: number): void {
		if (value === undefined) {
			log.e(`Trying to cache undefined value for id [${id}]`, getFullStack());
			return;
		}
		this.trim();
		let entry = this.cache[id];
		if (!entry) {
			entry = this.cache[id] = {
				insertTime: Game.time,
				value: value,
				ttl: ttl,
			};
		} else {
			entry.insertTime = Game.time;
			entry.value = value;
			entry.ttl = ttl;
		}
	}

	private trim() {
		if (Game.time % 50 == 0) {
			for (let [key, entry] of Object.entries(this.cache)) {
				if (Game.time - entry.insertTime > entry.ttl) {
					delete this.cache[key];
				}
			}
		}
	}
}

export class TickCacheService<T> implements CacheService<T> {
	private time: number = 0;
	private cache: { [key: number]: { [key: string]: T } } = {};

	get(id: string): T {
		return this.cache[Game.time]?.[id];
	}

	clear(id: string): void {
		delete this.cache[Game.time][id];
	}

	set(id: string, value: T): void {
		if (value === undefined) {
			log.e(`Trying to cache undefined value for id [${id}]`, getFullStack());
			return;
		}
		this.trim();
		this.cache[this.time][id] = value;
	}

	private trim() {
		if (Game.time != this.time) {
			this.time = Game.time;
			for (let time in this.cache) {
				if (Number(time) != this.time) {
					delete this.cache[time];
				}
			}
			this.cache[this.time] = {};
		}
	}
}

export let tickCacheService = new TickCacheService<any>();

export class MutatingCacheService<T, W> implements CacheService<T> {
	cache: CacheService<W>;
	private reader: (arg0: W) => T;
	private writer: (arg0: T) => W;

	constructor(cache: CacheService<W>, reader: (arg0: W) => T, writer: (arg0: T) => W) {
		this.cache = cache;
		this.reader = reader;
		this.writer = writer;
	}

	get(id: string): T {
		let value = this.cache.get(id);
		return value !== undefined ? this.reader(value) : undefined;
	}

	clear(id: string) {
		return this.cache.clear(id);
	}

	set(id: string, value: T, ttl: number): void {
		if (value === undefined) {
			log.e(`Trying to cache undefined value for id [${id}]`, getFullStack());
			return;
		}
		this.cache.set(id, this.writer(value), ttl);
	}
}

export class ChainingCacheService<T> implements CacheService<T> {
	private caches: CacheService<T>[] = [];

	constructor(...caches: CacheService<T>[]) {
		this.caches = caches;
	}

	get(id: string): T {
		let value = undefined;
		let i = 0;
		for (; i < this.caches.length; i++) {
			value = this.caches[i].get(id);
			if (value !== undefined) {
				break;
			}
		}
		// TODO: figure out a cleaner way to have server cache write back to tick cache, maybe abandon ChainingCacheService in favor of 3 custom implementations.
		if (value !== undefined && i > 0) {
			this.caches[0].set(id, value, 1);
		}
		return value;
	}

	clear(id: string): void {
		for (let cache of this.caches) {
			cache.clear(id);
		}
	}

	set(id: string, value: T, ttl: number): void {
		for (let cache of this.caches) {
			cache.set(id, value, ttl);
		}
	}
}

function fromMemory(id: Id<any>) {
	let o = Game.getObjectById(id);
	return o;
}

function toMemory(value: ObjectWithId<any>) {
	let id = value?.id ?? null;
	return id;
}

function fromMemoryMany(ids: Id<any>[]): ObjectWithId<any>[] {
	return ids.map(id => Game.getObjectById(id)).filter(_.identity);
}

function toMemoryMany(values: ObjectWithId<any>[]): Id<any>[] {
	return values.map(value => value.id);
}

let serverCacheStore = {};
let rawCache = new ObjectCacheService<any>(serverCacheStore);

export let rawServerCache = new ChainingCacheService(tickCacheService, rawCache);

export let objectServerCache: CacheService<ObjectWithId<any>> = new ChainingCacheService(tickCacheService, new MutatingCacheService(rawCache, fromMemory, toMemory));

export let objectsServerCache: CacheService<ObjectWithId<any>[]> = new ChainingCacheService(tickCacheService, new MutatingCacheService(rawCache, fromMemoryMany, toMemoryMany));

export function getWithCallback<T, ContextType>(cache: CacheService<unknown>, id: string, ttl: number, callback: (context?: ContextType) => T, context?: ContextType) {
	let value = cache.get(id) as T;
	if (value === undefined) {
		value = callback(context) ?? null;
		cache.set(id, value, ttl);
	}
	return value;
}
