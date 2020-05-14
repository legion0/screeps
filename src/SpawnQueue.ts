import * as assert from "./assert";
import { BODY_PART_SPAWN_TIME } from "./constants";
import { hasTicksToLive } from "./Creep";
import { tickCacheService, CacheService } from "./Cache";

declare global {
	interface Memory {
		spawnQueue: SpawmQueueMemory;
	}
}

interface SpawmQueueMemory {
	array: SpawnRequestMemory[];
	index: { [key: string]: null };
}

export interface SpawnRequest {
	// the base creep name, may have _alt appended to it in cases where the new creep is spawned before the old one dies.
	// use `getActiveCreep` to get the main and secondary creeps.
	baseCreepName: string;

	body: BodyPartConstant[];
	// where is the creep going after spawning, will be used to adjust actual spawning time.
	pos: RoomPosition;
	// when do you want the creep to arrive at its destination post spawning
	time: number;

	priority: number;
	opts?: SpawnOptions;
}

interface SpawnRequestMemory extends SpawnRequest {
	startTime: number;
	endTime: number;
}

export function getActiveCreep(baseCreepName: string): [Creep | undefined, Creep | undefined] {
	let main = Game.creeps[baseCreepName];
	let alt = Game.creeps[baseCreepName + '_alt'];

	if (hasTicksToLive(alt) && hasTicksToLive(main) && alt.ticksToLive > main.ticksToLive) {
		return [alt, main];
	} else if (hasTicksToLive(alt) && hasTicksToLive(main)) {
		return [alt, main];
	}
	return [main, alt];
}

class SpawnQueue {
	private memory: SpawmQueueMemory;

	private constructor(memory: SpawmQueueMemory) {
		this.memory = memory;
	}

	static loadOrCreate<M, P extends keyof M>(parentMemory: HasPropertyOfType<M, P, SpawmQueueMemory>, name: P) {
		let memory: SpawmQueueMemory | undefined = parentMemory[name];
		if (memory === undefined) {
			memory = { array: [], index: {} };
			parentMemory[name] = memory as any;
		}
		return new SpawnQueue(memory);
	}

	push(request: SpawnRequest): void {
		const duration = request.body.length * BODY_PART_SPAWN_TIME;

		let r: SpawnRequestMemory = Object.assign(request, {
			startTime: request.time - duration,
			endTime: request.time,
		});

		this.memory.array.push(r);
		this.memory.index[r.baseCreepName] = null;
		this.buubleUpR(this.memory.array.length - 1);
	}

	size(): number {
		return this.memory.array.length;
	}

	isEmpty(): boolean {
		return this.memory.array.length > 0 ? true : false;
	}

	peek(): SpawnRequest | undefined {
		return this.memory.array[0];
	}

	pop(): SpawnRequest | undefined {
		return this.memory.array.length > 0 ? this.memory.array.splice(0, 1)[0] : undefined;
	}

	// move element at position index to its correct position
	buubleUpR(index: number): void {
		if (index == 0) {
			return;
		}
		let current = this.memory.array[index];
		let previous = this.memory.array[index - 1];

		// if we are strictly later then previous then we can stop here
		if (isLater(current, previous)) {
			return;
		}

		if (isLater(previous, current) || current.priority > previous.priority || (current.priority == previous.priority && current.startTime < previous.startTime)) {
			this.memory.array[index] = previous;
			this.memory.array[index - 1] = current;
			this.buubleUpR(index - 1);
		}
	}
}

function getSpawnQueue() {
	let cache = tickCacheService as CacheService<SpawnQueue>;
	let queue = cache.get('spawnQueue');
	if (queue === undefined) {
		queue = SpawnQueue.loadOrCreate(Memory, 'spawnQueue');
		cache.set('spawnQueue', queue, 1);
	}
	return queue;
}

// function hasOverlap(lhs: SpawnRequestMemory, rhs: SpawnRequestMemory) {
// 	// return !(lhs.endTime <= rhs.startTime || rhs.endTime <= lhs.startTime);
// 	return lhs.endTime > rhs.startTime && rhs.endTime > lhs.startTime;
// }

// return true iff lhs comes after rhs
function isLater(lhs: SpawnRequestMemory, rhs: SpawnRequestMemory) {
	return lhs.startTime >= rhs.endTime;
}
