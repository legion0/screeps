import { PriorityQueue } from "./PriorityQueue";
import { events, EventEnum } from "./Events";
import { serverCache } from "./ServerCache";
import { everyN } from "./Tick";
import { log } from "./Logger";
import { errorCodeToString } from "./constants";

export enum SpawnQueuePriority {
	WORKER,
}

interface SpawnQueueItem {
	priority: number;
	name: string;
	body: BodyPartConstant[];
	cost: number;
	opts?: SpawnOptions;
}

interface RoomMemory {
	spawnQueue: PriorityQueue<SpawnQueueItem>;
}

function compareFunc(lhs: SpawnQueueItem, rhs: SpawnQueueItem) {
	return lhs.priority < rhs.priority;
}

function keyFunc(item: SpawnQueueItem) {
	return item.name;
}

export function requestCreepSpawn(room: Room, name: string, callback: () => SpawnQueueItem) {
	let queue = PriorityQueue.loadOrCreate(Memory.rooms[room.name], 'spawnQueue', compareFunc, keyFunc);
	if (!queue.hasItem(name)) {
		queue.push(callback());
	}
}

events.listen(EventEnum.EVENT_TICK_END, () => {
	_.values(Game.rooms).forEach(room => {
		let queue = PriorityQueue.loadOrCreate(room.memory, 'spawnQueue', compareFunc, keyFunc);
		let spawns = serverCache.get(`${room.name}.spawns`, 50, () => room.find(FIND_MY_SPAWNS)).filter(s => !s.spawning) as StructureSpawn[];
		while (!queue.isEmpty() && spawns.length > 0) {
			let request = queue.peek();
			if (room.energyAvailable < request.cost) {
				everyN(50, () => log.w(`Not enough energy for swawning next request in room [${room.name}]`));
				break;
			}
			request = queue.pop();
			let rv = spawns.pop().spawnCreep(request.body, request.name, request.opts);
			if (rv != OK) {
				log.e(`Failed to spawn new creep with error [${errorCodeToString(rv)}]`);
				console.log(room.energyAvailable, JSON.stringify(request));
			} else {
				// room.energyAvailable -= request.cost;
			}
		}
	});
});
