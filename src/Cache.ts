// TODO: move trim operations to event tick end

import { getFullStack, log } from './Logger';

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
		const entry = this.cache[id];
		if (entry) {
			const ttl = entry.ttl - (Game.time - entry.insertTime);
			if (ttlOut) {
				ttlOut[0] = ttl;
			}
			return ttl > 0 ? entry.value : undefined;
		}
		return undefined;
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
		const entry = this.cache[id];
		if (entry) {
			entry.insertTime = Game.time;
			entry.value = value;
			entry.ttl = ttl;
		} else {
			this.cache[id] = {
				insertTime: Game.time,
				value,
				ttl,
			};
		}
	}

	private trim() {
		if (Game.time % 50 === 0) {
			for (const [key, entry] of Object.entries(this.cache)) {
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
		if (Game.time !== this.time) {
			this.time = Game.time;
			for (const time in this.cache) {
				if (Number(time) !== this.time) {
					delete this.cache[time];
				}
			}
			this.cache[this.time] = {};
		}
	}
}

export const tickCacheService = new TickCacheService<any>();

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
		const value = this.cache.get(id, ttlOut);
		return value === undefined ? undefined : this.reader(value);
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

	/*
	 * Callback to find the value if its not in the cache or no longer valid.
	 * null return values are cached, undefined return values are not cached.
	 */
	callback: (context?: ContextType) => T | null | undefined;
	// Test function to test whether the value is valid or not.
	test?: (value: T) => boolean;
}

export function getFromCacheSpec<T, ContextType>(
	spec: CacheEntrySpec<T, ContextType>, id: string, context?: ContextType
): T | null | undefined {
	let value = spec.cache.get(id) as T | null | undefined;
	if (value === undefined || value !== null && spec.test && !spec.test(value)) {
		value = spec.callback(context);
		// Log.d(`Got value [${value}] from callback for id [${id}]`);
		if (value !== undefined) {
			spec.cache.set(id, value, spec.ttl);
		}
	}
	return value;
}
