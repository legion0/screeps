import { findMinBy } from './Array';
import { CacheService } from './Cache';
import { BODY_PART_SPAWN_TIME, errorCodeToString } from './constants';
import { EventEnum, events } from './Events';
import { log } from './Logger';
import { memInit } from './Memory';
import { fromMemoryWorld, RoomPositionMemory, toMemoryWorld } from './RoomPosition';
import { rawServerCache } from './ServerCache';
import { sortById } from './util';
import { everyN } from './Tick';
import { getEnergyAvailableForSpawn, getEnergyCapacityForSpawn } from './structure.spawn.energy';


declare global {
	interface Memory {
		spawnQueue: SpawnQueueMemory | undefined;
		clearSpawnQueue?: boolean;
	}
}

export enum SpawnQueuePriority {
	UNKNOWN,
	BOOT,
	ATTACK,
	HAULER,
	BUILDER,
	UPGRADER,
}

interface SpawnQueueMemory {
	array: SpawnRequestMemory[];
	index: { [key: string]: null; };
}

export interface SpawnRequest {
	/*
	 * The base creep name, may have _alt appended to it in cases where the new
	 * creep is spawned before the old one dies.
	 * use `getActiveCreep` to get the main and secondary creeps.
	 */
	name: string;

	bodyPartsCallbackName: Id<BodyPartsCallback>;
	// Where is the creep going after spawning, will be used to adjust actual spawning time.
	pos: RoomPosition;
	// When do you want the creep to arrive at its destination post spawning
	time: number;

	priority: SpawnQueuePriority;
	opts?: SpawnOptions;

	// Any serializable context you wish to pass into `BodyPartsCallback`.
	context?: any;
}

interface SpawnRequestMemory {
	name: string;
	bodyPartsCallbackName: Id<BodyPartsCallback>;
	cost: number;
	pos: RoomPositionMemory;
	startTime: number;
	endTime: number;
	priority: SpawnQueuePriority;
	opts?: SpawnOptions;
	context?: any;
}

function spawnRequestFromMemory(spawnRequestMemory: SpawnRequestMemory): SpawnRequest {
	return {
		name: spawnRequestMemory.name,
		bodyPartsCallbackName: spawnRequestMemory.bodyPartsCallbackName,
		pos: fromMemoryWorld(spawnRequestMemory.pos),
		time: spawnRequestMemory.endTime,
		priority: spawnRequestMemory.priority,
		opts: spawnRequestMemory.opts,
		context: spawnRequestMemory.context,
	};
}

function findClosestSpawnRoom(pos: RoomPosition) {
	const roomsWithSpawns = Object.values(Game.rooms)
		.filter(room => room.find(FIND_MY_SPAWNS).length);
	return findMinBy(
		roomsWithSpawns,
		room => Game.map.getRoomLinearDistance(room.name, pos.roomName));
}

export class SpawnQueue {
	private memory: SpawnQueueMemory;

	push(request: SpawnRequest): void {
		if (request.name in this.memory.index) {
			throw new Error(`Trying to re-queue [${request.name}]`);
		}
		const spawnRoom = findClosestSpawnRoom(request.pos);
		if (!spawnRoom) {
			log.e(`No spawn room found, failed to queue request: ${request}`);
			return;
		}
		const body = SpawnQueue.bodyPartsCallbacks_.get(request.bodyPartsCallbackName)(request, getEnergyCapacityForSpawn(spawnRoom));
		if (body == null) {
			log.e(`Cannot queue null body for request [${request.name}]`);
			return;
		}
		const duration = body.length * BODY_PART_SPAWN_TIME;

		const r: SpawnRequestMemory = {
			name: request.name,
			bodyPartsCallbackName: request.bodyPartsCallbackName,
			cost: _.sum(body, (part) => BODYPART_COST[part]),
			pos: toMemoryWorld(request.pos),
			priority: request.priority,
			opts: request.opts,
			startTime: request.time - duration,
			endTime: request.time,
			context: request.context,
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

		let request: SpawnRequestMemory = null;
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
			const body = SpawnQueue.bodyPartsCallbacks_.get(request.bodyPartsCallbackName)(spawnRequestFromMemory(request), getEnergyCapacityForSpawn(spawn.room));
			if (body == null) {
				log.w(`Skipping null body for request [${request.name}]`);
				this.run();
				return;
			}
			const rv = spawn.spawnCreep(body, request.name, request.opts);
			if (rv === OK) {
				log.v(`[${spawn}] spawning [${request.name}]`);
			} else {
				log.e(`[${spawn}] failed to spawn [${JSON.stringify(request)}] with error [${errorCodeToString(rv)}]`);
			}
		} else {
			everyN(50, () => {
				log.w(`Not enough energy for spawning next request [${request.name}] with cost [${request.cost}]`);
				if (request.endTime > Game.time + 200) {
					log.d(`Recalculating cost for request [${request.name}] with cost [${request.cost}]`);
					// Recalculate cost
					const spawnRoom = findClosestSpawnRoom(requestPos);
					if (!spawnRoom) {
						log.e(`No spawn room found, dropping queued request: ${request}`);
						this.pop();
						this.run();
						return;
					}
					const spawn = spawnRoom.find(FIND_MY_SPAWNS)[0];
					const body = SpawnQueue.bodyPartsCallbacks_.get(request.bodyPartsCallbackName)(spawnRequestFromMemory(request), getEnergyAvailableForSpawn(spawn));
					if (body == null) {
						log.w(`Skipping null body for request [${request.name}]`);
						this.pop();
						this.run();
						return;
					}
					request.cost = _.sum(body, (part) => BODYPART_COST[part]);
					log.d(`New cost for request [${request.name}] is [${request.cost}]`);
				}
			});
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

	static registerBodyPartsCallback(bodyPartsCallbackName: string, bodyPartsCallback: BodyPartsCallback) {
		SpawnQueue.bodyPartsCallbacks_.set(bodyPartsCallbackName, bodyPartsCallback);
	}

	private static bodyPartsCallbacks_: Map<string, BodyPartsCallback> = new Map();
}

export type BodyPartsCallback = (request: SpawnRequest, maxEnergy?: number) => BodyPartConstant[];

export function findAllSpawns(): StructureSpawn[] {
	return sortById(_.flatten(Object.values(Game.rooms).map((room) => room.find(FIND_MY_SPAWNS))));
}

function isLater(lhs: SpawnRequestMemory, rhs: SpawnRequestMemory) {
	return lhs.startTime >= rhs.endTime;
}

function initMemory(): SpawnQueueMemory {
	return memInit(Memory, 'spawnQueue', {
		array: [],
		index: {}
	});
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
