import * as A from './Action';
import { findRoomSource, requestCreepSpawn, RoomSource, SpawnQueueItem, SpawnQueuePriority } from "./Room";
import { findNearbyEnergy, lookForStructureAt } from './RoomPosition';
import { Task } from "./Task";
import { everyN } from "./Tick";
import { findMaxBy } from './Array';

interface SequenceContext {
	creep: Creep;
	task: TaskUpgradeController;
}

const upgradeControllerActions = [
	new A.Repair<SequenceContext>().setArgs(c => lookForStructureAt(STRUCTURE_ROAD, c.creep.pos)),
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

interface BodySpec {
	body: BodyPartConstant[];
	cost: number;
}

let harvesterBodySpec: BodySpec[] = [{
	body: [WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
}, {
	body: [WORK, CARRY, MOVE, MOVE],
}].map(spec => ({
	body: spec.body,
	cost: _.sum(spec.body, part => BODYPART_COST[part]),
}));

function creepSpawnCallback(room: Room, name: string): SpawnQueueItem {
	let bodySpec = findMaxBy(harvesterBodySpec, spec => spec.cost <= room.energyAvailable ? spec.cost : 0);
	return {
		priority: SpawnQueuePriority.UPGRADER,
		name: name,
		body: bodySpec.body,
		cost: bodySpec.cost,
	};
}

Task.register.registerTaskClass(TaskUpgradeController);
