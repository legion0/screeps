import { errorCodeToString } from './constants';
import { findEnergySourceForUpgrade, getUpgradeCreepBodyForEnergy, runUpgradeCreep } from './creep.upgrade';
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
		everyN(20, () => {
			for (const name of this.creepNames()) {
				maybeSpawnUpgradeCreep(name, this.room, this.fakeCreep);
			}
		});

		for (const name of this.creepNames()) {
			const creep = Game.creeps[name];
			if (creep) {
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

function maybeSpawnUpgradeCreep(name: string, room: Room, fakeCreep: Creep) {
	if (Game.creeps[name]) {
		return;
	}
	if (!hasHarvestCreeps(room)) {
		return;
	}
	if (SpawnQueue.getSpawnQueue().has(name)) {
		return;
	}
	if (!findEnergySourceForUpgrade(fakeCreep)) {
		return;
	}
	SpawnQueue.getSpawnQueue().push(buildSpawnRequest(room, name, Game.time));
}

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

function bodyPartsCallback(request: SpawnRequest, maxEnergy: number): BodyPartConstant[] {
	const room = Game.rooms[request.context.roomName];
	if (!hasHarvestCreeps(room)) {
		return null;
	}
	return getUpgradeCreepBodyForEnergy(maxEnergy);
}

const bodyPartsCallbackName = 'UpgradeCreep' as Id<BodyPartsCallback>;

SpawnQueue.registerBodyPartsCallback(bodyPartsCallbackName, bodyPartsCallback);

Task.register.registerTaskClass(TaskUpgradeController);
