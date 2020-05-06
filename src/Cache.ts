// TODO: move trim operations to event tick end

import { getFullStack, log } from "./Logger";

abstract class CacheService<T> {
	// returns the value from the cache or undefined if value is not in the cache or expired.
	abstract get(id: string): T;
	abstract set(id: string, value: T, ttl: number): void;
}

export class ObjectCacheService<T> extends CacheService<T> {
	private cache: { [key: string]: { insertTime: number, value: T, ttl: number } };

	constructor(obj: { [key: string]: any }) {
		super();
		this.cache = obj;
	}

	get(id: string): T {
		let entry = this.cache[id];
		return entry && (Game.time - entry.insertTime < entry.ttl) ? entry.value : undefined;
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

export class TickCacheService<T> extends CacheService<T> {
	private time: number = 0;
	private cache: { [key: number]: { [key: string]: T } } = {};

	get(id: string): T {
		return this.cache[Game.time]?.[id];
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

export class MutatingCacheService<T, W> extends CacheService<T> {
	cache: CacheService<W>;
	private reader: (arg0: W) => T;
	private writer: (arg0: T) => W;

	constructor(cache: CacheService<W>, reader: (arg0: W) => T, writer: (arg0: T) => W) {
		super();
		this.cache = cache;
		this.reader = reader;
		this.writer = writer;
	}

	get(id: string): T {
		let value = this.cache.get(id);
		return value !== undefined ? this.reader(value) : undefined;
	}

	set(id: string, value: T, ttl: number): void {
		if (value === undefined) {
			log.e(`Trying to cache undefined value for id [${id}]`, getFullStack());
			return;
		}
		this.cache.set(id, this.writer(value), ttl);
	}
}

export class ChainingCacheService<T> extends CacheService<T> {
	private caches: CacheService<T>[] = [];

	constructor(...caches: CacheService<T>[]) {
		super();
		this.caches = caches;
	}

	get(id: string): T {
		let value = undefined;
		for (let cache of this.caches) {
			value = cache.get(id);
			if (value != undefined) {
				return value;
			}
		}
	}

	set(id: string, value: T, ttl: number): void {
		for (let cache of this.caches) {
			cache.set(id, value, ttl);
		}
	}
}

function fromMemory(id: Id<any>) {
	return Game.getObjectById(id);
}

function toMemory(value: ObjectWithId<any>) {
	return value?.id ?? null;
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

export function getWithCallback<T, ContextType>(cache: CacheService<T>, id: string, ttl: number, callback: (context?: ContextType) => T, context?: ContextType) {
	let value = cache.get(id);
	if (value === undefined) {
		value = callback(context);
		cache.set(id, value ?? null, ttl);
	}
	return value;
}
