import {CacheService, ObjectCacheService} from './Cache';
import {memInit} from './Memory';
import {EventEnum, events} from './Events';

export type MemoryCachable = string | number | string[] | number[];

declare global {
	interface Memory {
		cache: { [key: string]: MemoryCachable };
	}
}

class MemoryCache implements CacheService<MemoryCachable> {
	private cache: ObjectCacheService<MemoryCachable>;

	get (id: string): MemoryCachable | undefined {
		return this.cache.get(id);
	}

	set (id: string, value: MemoryCachable, ttl: number): void {
		return this.cache.set(id, value, ttl);
	}

	clear (id: string): void {
		return this.cache.clear(id);
	}

	static updateStore () {
		memoryCache.cache = new ObjectCacheService<MemoryCachable>(Memory.cache);
	}
}

memInit(Memory, 'cache', {});

export const memoryCache = new MemoryCache();

events.listen(EventEnum.EVENT_TICK_START, MemoryCache.updateStore);
