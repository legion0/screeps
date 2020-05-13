import { CacheService, ObjectCacheService } from "./Cache";
import { MemInit } from "./Memory";
import { events, EventEnum } from "./Events";

export type MemoryCachable = string | number | string[] | number[];

declare global {
	interface Memory {
		cache: { [key: string]: MemoryCachable };
	}
}

class MemoryCache implements CacheService<MemoryCachable> {
	private cache: ObjectCacheService<MemoryCachable>;

	get(id: string): MemoryCachable | undefined {
		return this.cache.get(id);
	}
	set(id: string, value: MemoryCachable, ttl: number): void {
		return this.cache.set(id, value, ttl);
	}
	clear(id: string): void {
		return this.cache.clear(id);
	}

	static updateStore() {
		memoryCache.cache = new ObjectCacheService<MemoryCachable>(Memory.cache);
	}
}

MemInit(Memory, 'cache', {});

export let memoryCache = new MemoryCache();

events.listen(EventEnum.EVENT_TICK_START, MemoryCache.updateStore);
