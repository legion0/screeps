import { findMinBy } from "./Array";
import { CacheService } from "./Cache";
import { BODY_PART_SPAWN_TIME, errorCodeToString } from "./constants";
import { log } from "./Logger";
import { SpawnQueuePriority } from "./Room";
import { rawServerCache } from "./ServerCache";
import { sortById } from "./util";
import { RoomPositionMemory, toMemoryWorld, fromMemoryWorld } from "./RoomPosition";
import { events, EventEnum } from "./Events";
import { MemInit } from "./Memory";
import { getCreepSpawnName } from "./Creep";

export { SpawnQueuePriority };

declare global {
	interface Memory {
		spawnQueue: SpawnQueueMemory | undefined;
	}
}

interface SpawnQueueMemory {
	array: SpawnRequestMemory[];
	index: { [key: string]: null };
}

export interface SpawnRequest {
	// the base creep name, may have _alt appended to it in cases where the new creep is spawned before the old one dies.
	// use `getActiveCreep` to get the main and secondary creeps.
	name: string;

	body: BodyPartConstant[];
	// where is the creep going after spawning, will be used to adjust actual spawning time.
	pos: RoomPosition;
	// when do you want the creep to arrive at its destination post spawning
	time: number;

	priority: SpawnQueuePriority;
	opts?: SpawnOptions;
}

interface SpawnRequestMemory {
	name: string;
	body: BodyPartConstant[];
	pos: RoomPositionMemory;
	startTime: number;
	endTime: number;
	priority: SpawnQueuePriority;
	opts?: SpawnOptions;
}

export class SpawnQueue {
	private memory: SpawnQueueMemory;

	push(request: SpawnRequest): void {
		if (request.name in this.memory.index) {
			throw new Error(`Trying to re-queue [${request.name}]`);
		}
		const duration = request.body.length * BODY_PART_SPAWN_TIME;

		let r: SpawnRequestMemory = {
			name: request.name,
			body: request.body,
			pos: toMemoryWorld(request.pos),
			priority: request.priority,
			opts: request.opts,
			startTime: request.time - duration,
			endTime: request.time,
		};

		log.d(`Pushing new request for [${request.name}]`);
		this.memory.array.push(r);
		this.memory.index[r.name] = null;
		this.bubbleUpR(this.memory.array.length - 1);
	}

	// private size(): number {
	// 	return this.memory.array.length;
	// }

	has(name: string): boolean {
		return name in this.memory.index;
	}

	private isEmpty(): boolean {
		return this.memory.array.length > 0 ? false : true;
	}

	private peek(): SpawnRequestMemory | undefined {
		return this.memory.array[0];
	}

	private pop(): SpawnRequestMemory | undefined {
		if (this.memory.array.length == 0) {
			return undefined;
		}
		let item = this.memory.array.splice(0, 1)[0];
		delete this.memory.index[item.name];
		return item;
	}

	// move element at position index to its correct position
	private bubbleUpR(index: number): void {
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
			this.bubbleUpR(index - 1);
		}
	}

	run() {
		if (this.isEmpty() || this.peek()!.startTime > Game.time) {
			return;
		}

		let request = this.peek()!;
		let requestPos = fromMemoryWorld(request.pos);
		let spawns = findAllSpawns().filter(s => !s.spawning);
		let spawn = findMinBy(spawns, s => s.pos.getRangeTo(requestPos));
		if (spawn) {
			this.pop();
			let newName = getCreepSpawnName(request.name);
			let rv = spawn.spawnCreep(request.body, newName, request.opts);
			if (rv == OK) {
				log.v(`[${spawn}] spawning [${request.name}]`);
			} else {
				log.e(`[${spawn}] failed to spawn [${JSON.stringify(request)}] with error [${errorCodeToString(rv)}]`);
			}
		}
	}

	static getSpawnQueue(): SpawnQueue {
		let cache = rawServerCache as CacheService<SpawnQueue>;
		let queue = cache.get('spawnQueue');
		if (queue == null) {
			queue = new SpawnQueue();
			cache.set('spawnQueue', queue, 10000);
		}
		queue.memory = initMemory();
		return queue;
	}
}

export function findAllSpawns(): StructureSpawn[] {
	return sortById(_.flatten(Object.values(Game.rooms).map(room => room.find(FIND_MY_SPAWNS))));
}

// function hasOverlap(lhs: SpawnRequestMemory, rhs: SpawnRequestMemory) {
// 	// return !(lhs.endTime <= rhs.startTime || rhs.endTime <= lhs.startTime);
// 	return lhs.endTime > rhs.startTime && rhs.endTime > lhs.startTime;
// }

// return true iff lhs comes after rhs
function isLater(lhs: SpawnRequestMemory, rhs: SpawnRequestMemory) {
	return lhs.startTime >= rhs.endTime;
}

function initMemory(): SpawnQueueMemory {
	return MemInit(Memory, 'spawnQueue', { array: [], index: {} });
}

events.listen(EventEnum.HARD_RESET, () => {
	Memory.spawnQueue = undefined;
	initMemory();
});