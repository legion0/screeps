// TODO: move trim operations to event tick end

import { getFullStack, log } from "./Logger";
import { threadId } from "worker_threads";

export interface CacheService<T> {
	get(id: string, ttlOut?: [number]): T | undefined;
	// `value` must be !== undefined and implementations should log an error when undefined is being cached.
	set(id: string, value: T, ttl: number): void;
	clear(id: string): void;
}

export class ObjectCacheService<T> implements CacheService<T> {
	private cache: { [key: string]: { insertTime: number, value: T, ttl: number } };

	constructor(obj: { [key: string]: any }) {
		this.cache = obj;
	}

	get(id: string, ttlOut?: [number]): T | undefined {
		let entry = this.cache[id];
		if (entry) {
			let ttl = entry.ttl - (Game.time - entry.insertTime);
			if (ttlOut) {
				ttlOut[0] = ttl;
			}
			return ttl > 0 ? entry.value : undefined;
		}
		return undefined;
	}

	clear(id: string): void {
		delete this.cache[id];;
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

	get(id: string): T | undefined {
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

	get(id: string, ttlOut?: [number]): T | undefined {
		let value = this.cache.get(id, ttlOut);
		return value !== undefined ? this.reader(value) : undefined;
	}

	clear(id: string): void {
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

export interface CacheEntrySpec<T, ContextType> {
	cache: CacheService<T | null>;
	ttl: number;
	// callback to find the value if its not in the cache or no longer valid.
	// null return values are cached, undefined return values are not cached.
	callback: (context?: ContextType) => T | null | undefined;
	// test function to test whether the value is valid or not.
	test?: (value: T) => boolean;
}

export function getFromCacheSpec<T, ContextType>(spec: CacheEntrySpec<T, ContextType>, id: string, context?: ContextType): T | null | undefined {
	let value = spec.cache.get(id) as T | null | undefined;
	if (value === undefined || (value != null && spec.test && !spec.test(value))) {
		value = spec.callback(context);
		if (value !== undefined) {
			spec.cache.set(id, value, spec.ttl);
		}
	}
	return value;
}
