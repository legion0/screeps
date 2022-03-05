import * as A from './Action';
import { createBodySpec, getBodyForRoom } from './BodySpec';
import { getActiveCreepTtl, isActiveCreepSpawning, getLiveCreepsAll } from './Creep';
import { findRoomSource, findStructuresByType, RoomSource } from './Room';
import { findNearbyEnergy, lookForConstructionAt, lookForStructureAt } from './RoomPosition';
import { SpawnQueue, SpawnRequest, SpawnQueuePriority, BodyPartsCallback } from './SpawnQueue';
import { Task } from './Task';
import { everyN } from './Tick';
import { GENERIC_WORKER } from './constants';
import { runUpgradeCreep } from './creeps.upgrade';
import { hasHarvestCreeps } from './Task.HarvestSource';

export class TaskUpgradeController extends Task {
	static className = 'UpgradeController' as Id<typeof Task>;

	readonly room: Room;

	constructor(roomName: Id<TaskUpgradeController>) {
		super(TaskUpgradeController, roomName);
		this.room = Game.rooms[roomName];
	}

	protected run() {
		everyN(20, () => {
			for (const name of this.creepNames()) {
				if (getActiveCreepTtl(name) > 50 || isActiveCreepSpawning(name)) {
					continue;
				}
				const queue = SpawnQueue.getSpawnQueue();
				queue.has(name) || queue.push(buildSpawnRequest(this.room, name));
			}
		});

		for (const creep of getLiveCreepsAll(this.creepNames())) {
			runUpgradeCreep(creep, this.room);
		}
	}

	private creepNames(): string[] {
		let numCreeps = 1;
		// use containers as proxy for room age/ability
		if (findStructuresByType(this.room, STRUCTURE_CONTAINER).length > 0) {
			numCreeps = 3;
		}
		return _.range(0, numCreeps).map((i) => `${this.id}.${i}`);
	}

	static create(roomName: string) {
		const rv = Task.createBase(TaskUpgradeController, roomName as Id<Task>);
		if (rv !== OK) {
			return rv;
		}
		return new TaskUpgradeController(roomName as Id<TaskUpgradeController>);
	}
}

const bodySpec = createBodySpec([
	[WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
	GENERIC_WORKER,
]);

function buildSpawnRequest(room: Room, name: string): SpawnRequest {
	return {
		name,
		bodyPartsCallbackName: bodyPartsCallbackName,
		priority: SpawnQueuePriority.UPGRADER,
		time: Game.time + getActiveCreepTtl(name),
		pos: room.controller.pos,
		context: {
			roomName: room.name,
		}
	};
}

function bodyPartsCallback(request: SpawnRequest): BodyPartConstant[] {
	const room = Game.rooms[request.context.roomName];
	if (!hasHarvestCreeps(room)) {
		return null;
	}
	return getBodyForRoom(room, bodySpec);
}

const bodyPartsCallbackName = 'UpgradeCreep' as Id<BodyPartsCallback>;

SpawnQueue.registerBodyPartsCallback(bodyPartsCallbackName, bodyPartsCallback);

Task.register.registerTaskClass(TaskUpgradeController);
