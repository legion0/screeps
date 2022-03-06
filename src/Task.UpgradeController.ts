import { createBodySpec, getBodyForRoom } from './BodySpec';
import { GENERIC_WORKER } from './constants';
import { runUpgradeCreep } from './creeps.upgrade';
import { CreepPair } from './creep_pair';
import { findStructuresByType } from './Room';
import { BodyPartsCallback, SpawnQueue, SpawnQueuePriority, SpawnRequest } from './SpawnQueue';
import { Task } from './Task';
import { hasHarvestCreeps } from './Task.HarvestSource';
import { everyN } from './Tick';

export class TaskUpgradeController extends Task {
	static className = 'UpgradeController' as Id<typeof Task>;

	readonly room: Room;

	constructor(roomName: Id<TaskUpgradeController>) {
		super(TaskUpgradeController, roomName);
		this.room = Game.rooms[roomName];
	}

	protected run() {
		for (const name of this.creepNames()) {
			const creepPair = new CreepPair(name);
			everyN(20, () => {
				if (creepPair.getActiveCreepTtl() < 50) {
					SpawnQueue.getSpawnQueue().has(creepPair.getSecondaryCreepName())
						|| creepPair.getSecondaryCreep()?.spawning
						|| SpawnQueue.getSpawnQueue().push(
							buildSpawnRequest(this.room, creepPair.getSecondaryCreepName(),
								Game.time + creepPair.getActiveCreepTtl()));
				}
			});
			for (const creep of creepPair.getLiveCreeps()) {
				runUpgradeCreep(creep, this.room);
			}
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

function buildSpawnRequest(room: Room, name: string, time: number): SpawnRequest {
	return {
		name,
		bodyPartsCallbackName: bodyPartsCallbackName,
		priority: SpawnQueuePriority.UPGRADER,
		time: time,
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
