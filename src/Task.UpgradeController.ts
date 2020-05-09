import * as A from './Action';
import { findRoomSource, requestCreepSpawn, RoomSource, SpawnQueuePriority, SpawnQueueItem } from "./Room";
import { findNearbyEnergy, lookForRoad } from './RoomPosition';
import { Task } from "./Task";
import { everyN } from "./Tick";

interface SequenceContext {
	creep: Creep;
	task: TaskUpgradeController;
}

const upgradeControllerActions = [
	new A.Repair<SequenceContext>().setArgs(c => lookForRoad(c.creep.pos)),
	new A.UpgradeController<SequenceContext>().setArgs(c => c.task.controller).setHighway(),
	new A.Pickup<SequenceContext>().setArgs(c => findNearbyEnergy(c.creep.pos)),
	new A.Withdraw<SequenceContext>().setArgs(c => c.task.roomSource).setPersist().setHighway(),
];

export class TaskUpgradeController extends Task {
	static className = 'UpgradeController' as Id<typeof Task>;

	readonly room: Room;
	readonly controller: StructureController;
	readonly roomSource?: RoomSource;

	constructor(roomName: Id<TaskUpgradeController>) {
		super(TaskUpgradeController, roomName);
		this.room = Game.rooms[roomName];
		this.controller = Game.rooms[roomName]?.controller;
		this.roomSource = findRoomSource(this.room);
	}

	protected run() {
		let numCreeps = 3;
		for (let name of _.range(0, numCreeps).map(i => `${this.id}.${i}`)) {
			let creep = Game.creeps[name];
			if (creep) {
				A.runSequence(upgradeControllerActions, creep, { creep: creep, task: this });
			} else {
				everyN(20, () => {
					requestCreepSpawn(this.controller.room, name, creepSpawnCallback);
				});
			}
		}
	}

	static create(roomName: string) {
		let rv = Task.createBase(TaskUpgradeController, roomName as Id<Task>);
		if (rv != OK) {
			return rv;
		}
		return new TaskUpgradeController(roomName as Id<TaskUpgradeController>);
	}
}

function creepSpawnCallback(room: Room, name: string): SpawnQueueItem {
	let body: BodyPartConstant[] = [];
	if (room.energyCapacityAvailable >= 550) {
		body = [WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
	} else {
		body = [WORK, CARRY, MOVE, MOVE];
	}

	let cost = _.sum(body, part => BODYPART_COST[part]);
	return {
		priority: SpawnQueuePriority.UPGRADER,
		name: name,
		body: body,
		cost: cost,
	};
}

Task.register.registerTaskClass(TaskUpgradeController);
