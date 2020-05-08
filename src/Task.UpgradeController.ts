import * as A from './Action';
import { findRoomSource, requestCreepSpawn, RoomSource, SpawnQueuePriority } from "./Room";
import { findNearbyEnergy } from './RoomPosition';
import { Task } from "./Task";
import { everyN } from "./Tick";

interface SequenceContext {
	creep: Creep;
	task: TaskUpgradeController;
}

const upgradeControllerActions = [
	new A.UpgradeController<SequenceContext>().setCallback(c => c.task.controller),
	new A.Pickup<SequenceContext>().setCallback(c => findNearbyEnergy(c.creep.pos)),
	new A.Withdraw<SequenceContext>().setCallback(c => c.task.roomSource).setPersist(),
];

export class TaskUpgradeController extends Task {
	static className = 'TaskUpgradeController' as Id<typeof Task>;

	readonly room: Room;
	readonly controller?: StructureController;
	readonly roomSource?: RoomSource;

	constructor(roomName: Id<TaskUpgradeController>) {
		super(TaskUpgradeController, roomName);
		this.room = Game.rooms[roomName];
		this.controller = Game.rooms[roomName]?.controller;
		this.roomSource = findRoomSource(this.room);
	}

	protected run() {
		let name = this.id;
		let creep = Game.creeps[name];
		if (creep) {
			A.runSequence(upgradeControllerActions, creep, { creep: creep, task: this });
		} else {
			everyN(20, () => requestCreepSpawn(this.controller?.room, name, () => ({
				priority: SpawnQueuePriority.UPGRADER,
				name: name,
				body: [MOVE, MOVE, CARRY, WORK],
				cost: BODYPART_COST[MOVE] + BODYPART_COST[MOVE] + BODYPART_COST[CARRY] + BODYPART_COST[WORK],
			})));
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

Task.register.registerTaskClass(TaskUpgradeController);
