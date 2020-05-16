import { findMinBy } from './Array';
import { CacheService } from './Cache';
import { BODY_PART_SPAWN_TIME, errorCodeToString } from './constants';
import { getCreepSpawnName } from './Creep';
import { EventEnum, events } from './Events';
import { log } from './Logger';
import { memInit } from './Memory';
import { fromMemoryWorld, RoomPositionMemory, toMemoryWorld } from './RoomPosition';
import { rawServerCache } from './ServerCache';
import { sortById } from './util';
import { everyN } from './Tick';


declare global {
	interface Memory {
		spawnQueue: SpawnQueueMemory | undefined;
		clearSpawnQueue?: boolean;
	}
}

export enum SpawnQueuePriority {
  UNKNOWN,
	WORKER,
	HAULER,
	HARVESTER,
	BUILDER,
	UPGRADER,
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
	cost: number;
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
			cost: _.sum(request.body, (part) => BODYPART_COST[part]),
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
		current.priority < previous.priority ||
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

		let request: SpawnRequestMemory;
		let validSpawns: StructureSpawn[];
		while (!this.isEmpty()) {
			request = this.peek()!;
			validSpawns = findAllSpawns()
				.filter((s) => s.room.energyCapacityAvailable >= request.cost);
			if (validSpawns.length) {
				break;
			}
			log.e('Discarding invalid request', request);
			this.pop();
		}
		if (this.isEmpty()) {
			return;
		}

		const requestPos = fromMemoryWorld(request.pos);
		const availableSpawns = validSpawns.filter((s) => !s.spawning)
			.filter((s) => s.room.energyAvailable >= request.cost);
		const spawn = findMinBy(availableSpawns, (s) => s.pos.getRangeTo(requestPos));
		if (spawn) {
			this.pop();
			const newName = getCreepSpawnName(request.name);
			const rv = spawn.spawnCreep(request.body, newName, request.opts);
			if (rv === OK) {
				log.v(`[${spawn}] spawning [${request.name}]`);
			} else {
				log.e(`[${spawn}] failed to spawn [${JSON.stringify(request)}] with error [${errorCodeToString(rv)}]`);
			}
		} else {
			everyN(50, () => log.w(`Not enough energy for spawning next request [${request.name}] with cost [${request.cost}]`));
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

events.listen(EventEnum.EVENT_TICK_END, () => {
	if (Memory.clearSpawnQueue) {
		log.w('Clearing spawn queue!');
		delete Memory.clearSpawnQueue;
		Memory.spawnQueue = undefined;
		initMemory();
	}
});
