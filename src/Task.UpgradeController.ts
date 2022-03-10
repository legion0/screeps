import { createBodySpec, getBodyForRoom } from './BodySpec';
import { errorCodeToString, GENERIC_WORKER } from './constants';
import { findEnergySourceForUpgrade, runUpgradeCreep } from './creep.upgrade';
import { CreepPair } from './creep_pair';
import { Highway } from './Highway';
import { log } from './Logger';
import { findStructuresByType } from './Room';
import { BodyPartsCallback, SpawnQueue, SpawnQueuePriority, SpawnRequest } from './SpawnQueue';
import { Task } from './Task';
import { hasHarvestCreeps } from './Task.HarvestSource';
import { everyN } from './Tick';

export class TaskUpgradeController extends Task {
	static className = 'UpgradeController' as Id<typeof Task>;

	readonly room: Room;
	private fakeCreep: Creep;

	constructor(roomName: Id<TaskUpgradeController>) {
		super(TaskUpgradeController, roomName);
		this.room = Game.rooms[roomName];
		this.fakeCreep = {
			pos: this.room.controller.pos,
			room: this.room,
			memory: {},
		} as any as Creep;
	}

	protected run() {
		for (const name of this.creepNames()) {
			const creepPair = new CreepPair(name);
			everyN(20, () => {
				if (!findEnergySourceForUpgrade(this.fakeCreep)) {
					return;
				}
				if (creepPair.getActiveCreepTtl() < 50) {
					SpawnQueue.getSpawnQueue().has(creepPair.getSecondaryCreepName())
						|| creepPair.getSecondaryCreep()
						|| SpawnQueue.getSpawnQueue().push(
							buildSpawnRequest(this.room, creepPair.getSecondaryCreepName(),
								Game.time + creepPair.getActiveCreepTtl()));
				}
			});
			for (const creep of creepPair.getLiveCreeps()) {
				runUpgradeCreep(creep, this.room);
			}
		}
		everyN(20, () => {
			for (const container of findStructuresByType(this.room, STRUCTURE_CONTAINER)) {
				const highway = Highway.createHighway(this.room.controller.pos, container.pos);
				if (highway instanceof Highway) {
					highway.buildRoad();
				} else {
					log.e(`Failed to build highway from container at [${container.pos}] to controller at [${this.room.controller.pos}] with error: [${errorCodeToString(highway)}]`);
				}

			}
		});
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
