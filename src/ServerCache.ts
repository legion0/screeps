import {memInit} from './Memory';
import {log} from './Logger';
import {CacheService, MutatingCacheService, ObjectCacheService, tickCacheService} from './Cache';
import {MemoryCachable, memoryCache} from './MemoryCache';

declare global {
	interface Memory {
		nextServerId: number;
		serverCache: {
			servers: { [key: /* serverId=*/number]: /* lastActive=*/number };
			stableSince: number;
		};
	}
}

memInit(Memory, 'nextServerId', 0);
export const serverId = Memory.nextServerId++;

memInit(Memory, 'serverCache', {
	'servers': {},
	'stableSince': 0,
});

/*
 * The expected server count, we will compute the actual one but this is used
 * to determine how long to wait for the serve reloads to stabilize.
 */
const EXPECTED_SERVER_COUNT = 3;

/**
 * @example
 */
export function checkServerCache () {
	if (!(serverId in Memory.serverCache.servers)) {
		log.d(`Server [${serverId}] is joining the server list at [${Game.time}]`);
		Memory.serverCache.stableSince = Game.time;
	}
	Memory.serverCache.servers[serverId] = Game.time;

	for (const [sid, lastActive] of Object.entries(Memory.serverCache.servers)) {
		if (lastActive + 2 * EXPECTED_SERVER_COUNT < Game.time) {
			log.d(`Server [${sid}] appears to be inactive, removing from server list at [${Game.time}]`);
			delete Memory.serverCache.servers[sid];
			Memory.serverCache.stableSince = Game.time;
		}
	}

	const isStable = Memory.serverCache.stableSince + 3 * EXPECTED_SERVER_COUNT < Game.time;
	if (isStable && Memory.serverCache.stableSince + 3 * EXPECTED_SERVER_COUNT + 1 == Game.time) {
		log.d(`Stable servers detected with size [${_.size(Memory.serverCache.servers)}] at time [${Game.time}]`);
	}
}


function deserializeFromObjectId (id: Id<any>) {
	const o = Game.getObjectById(id);
	return o;
}

function serializeToObjectId (value: ObjectWithId<any>) {
	const id = value?.id ?? null;
	return id;
}

function deserializeFromObjectIds (ids: Id<any>[]): ObjectWithId<any>[] {
	return ids.map((id) => Game.getObjectById(id)).filter(_.identity);
}

function serializeToObjectIds (values: ObjectWithId<any>[]): Id<any>[] {
	return values.map((value) => value.id);
}

class ChainingCache<T> implements CacheService<T> {
	private first: CacheService<T>;

	private second: CacheService<T>;

	constructor (first: CacheService<T>, second: CacheService<T>) {
		this.first = first;
		this.second = second;
	}

	get (id: string, ttlOut?: [number]) {
		ttlOut = ttlOut ?? [1];
		let value = this.first.get(id, ttlOut);
		if (value === undefined) {
			value = this.second.get(id, ttlOut);
			if (value !== undefined) {
				this.first.set(id, value, ttlOut[0]);
			}
		}
		return value;
	}

	set (id: string, value: any, ttl: number): void {
		this.first.set(id, value, ttl);
		this.second.set(id, value, ttl);
	}

	clear (id: string): void {
		this.first.clear(id);
		this.second.clear(id);
	}
}

const serverCacheStore = {};
const rawCache: CacheService<any> = new ObjectCacheService<any>(serverCacheStore);

export const rawServerCache: CacheService<any> = new ChainingCache(tickCacheService, rawCache);
export const rawServerStrongCache: CacheService<MemoryCachable> = new ChainingCache(rawServerCache, memoryCache);

export const objectServerCache: CacheService<ObjectWithId<any>> = new ChainingCache(tickCacheService, new MutatingCacheService(rawCache, deserializeFromObjectId, serializeToObjectId));
export const objectServerStrongCache: CacheService<ObjectWithId<any>> = new ChainingCache(objectServerCache, new MutatingCacheService(memoryCache, deserializeFromObjectId, serializeToObjectId));

export const objectsServerCache: CacheService<ObjectWithId<any>[]> = new ChainingCache(tickCacheService, new MutatingCacheService(rawCache, deserializeFromObjectIds, serializeToObjectIds));
export const objectsServerStrongCache: CacheService<ObjectWithId<any>[]> = new ChainingCache(objectsServerCache, new MutatingCacheService(memoryCache, deserializeFromObjectIds, serializeToObjectIds));

/*
 * Use server cache to estimate elapsed time
 * prefer Game.time % N == 0 if condition is tested every tick,
 * for cases where the condition is not tested every tick use `elapsed`.
 * this fucntion needs to be called at least once every 2 * ttl or it will assume its the first time its called.
 */
/**
 * @param id
 * @param ttl
 * @param update
 * @example
 */
export function elapsed (id: string, ttl: number, update: boolean) {
	const cache = rawServerCache as CacheService<number>;
	let value = cache.get(id);
	if (value === undefined || update) {
		value = Game.time;
		cache.set(id, value, 2 * ttl);
	}
	return value + ttl < Game.time;
}
