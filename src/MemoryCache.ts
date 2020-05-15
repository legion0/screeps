import { CacheService, ObjectCacheService } from './Cache';
import { EventEnum, events } from './Events';
import { memInit } from './Memory';

export type MemoryCacheable = string | number | string[] | number[];

declare global {
	interface Memory {
		cache: { [key: string]: MemoryCacheable };
	}
}

class MemoryCache implements CacheService<MemoryCacheable> {
	private cache: ObjectCacheService<MemoryCacheable>;

	get(id: string): MemoryCacheable | undefined {
		return this.cache.get(id);
	}

	set(id: string, value: MemoryCacheable, ttl: number): void {
		return this.cache.set(id, value, ttl);
	}

	clear(id: string): void {
		return this.cache.clear(id);
	}

	static updateStore() {
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		memoryCache.cache = new ObjectCacheService<MemoryCacheable>(Memory.cache);
	}
}

memInit(Memory, 'cache', {});

export const memoryCache = new MemoryCache();

events.listen(EventEnum.EVENT_TICK_START, MemoryCache.updateStore);
