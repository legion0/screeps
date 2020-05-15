import { findMinBy } from './Array';
import { CacheService } from './Cache';
import { BODY_PART_SPAWN_TIME, errorCodeToString } from './constants';
import { getCreepSpawnName } from './Creep';
import { EventEnum, events } from './Events';
import { log } from './Logger';
import { memInit } from './Memory';
import { SpawnQueuePriority } from './Room';
import { fromMemoryWorld, RoomPositionMemory, toMemoryWorld } from './RoomPosition';
import { rawServerCache } from './ServerCache';
import { sortById } from './util';

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

	/*
	 * The base creep name, may have _alt appended to it in cases where the new
	 * creep is spawned before the old one dies.
	 * use `getActiveCreep` to get the main and secondary creeps.
	 */
	name: string;

	body: BodyPartConstant[];
	// Where is the creep going after spawning, will be used to adjust actual spawning time.
	pos: RoomPosition;
	// When do you want the creep to arrive at its destination post spawning
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

		const r: SpawnRequestMemory = {
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

	has(name: string): boolean {
		return name in this.memory.index;
	}

	private isEmpty(): boolean {
		return !(this.memory.array.length > 0);
	}

	private peek(): SpawnRequestMemory | undefined {
		return this.memory.array[0];
	}

	private pop(): SpawnRequestMemory | undefined {
		if (this.memory.array.length === 0) {
			return undefined;
		}
		const [item] = this.memory.array.splice(0, 1);
		delete this.memory.index[item.name];
		return item;
	}

	// Move element at position index to its correct position
	private bubbleUpR(index: number): void {
		if (index === 0) {
			return;
		}
		const current = this.memory.array[index];
		const previous = this.memory.array[index - 1];

		// If we are strictly later then previous then we can stop here
		if (isLater(current, previous)) {
			return;
		}

		if (isLater(previous, current) ||
		current.priority > previous.priority ||
		current.priority === previous.priority && current.startTime < previous.startTime) {
			this.memory.array[index] = previous;
			this.memory.array[index - 1] = current;
			this.bubbleUpR(index - 1);
		}
	}

	run() {
		if (this.isEmpty() || this.peek()!.startTime > Game.time) {
			return;
		}

		const request = this.peek()!;
		const requestPos = fromMemoryWorld(request.pos);
		const spawns = findAllSpawns().filter((s) => !s.spawning);
		const spawn = findMinBy(spawns, (s) => s.pos.getRangeTo(requestPos));
		if (spawn) {
			this.pop();
			const newName = getCreepSpawnName(request.name);
			const rv = spawn.spawnCreep(request.body, newName, request.opts);
			if (rv === OK) {
				log.v(`[${spawn}] spawning [${request.name}]`);
			} else {
				log.e(`[${spawn}] failed to spawn [${JSON.stringify(request)}] with error [${errorCodeToString(rv)}]`);
			}
		}
	}

	static getSpawnQueue(): SpawnQueue {
		const cache = rawServerCache as CacheService<SpawnQueue>;
		let queue = cache.get('spawnQueue');
		if (!queue) {
			queue = new SpawnQueue();
			cache.set('spawnQueue', queue, 10000);
		}
		queue.memory = initMemory();
		return queue;
	}
}

export function findAllSpawns(): StructureSpawn[] {
	return sortById(_.flatten(Object.values(Game.rooms).map((room) => room.find(FIND_MY_SPAWNS))));
}

function isLater(lhs: SpawnRequestMemory, rhs: SpawnRequestMemory) {
	return lhs.startTime >= rhs.endTime;
}

function initMemory(): SpawnQueueMemory {
	return memInit(Memory, 'spawnQueue', { array: [],
		index: {} });
}

events.listen(EventEnum.HARD_RESET, () => {
	Memory.spawnQueue = undefined;
	initMemory();
});
