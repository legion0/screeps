import * as A from './Action';
import { findMinBy } from "./Array";
import { getWithCallback, objectServerCache } from "./Cache";
import { findSources, requestCreepSpawn, SpawnQueuePriority } from "./Room";
import { findNearbyEnergy } from './RoomPosition';
import { isConcreteStructure } from "./Structure";
import { Task } from "./Task";
import { everyN } from "./Tick";

interface SequenceContext {
	creep: Creep;
	task: TaskUpgradeController;
}

const upgradeControllerActions = [
	// continue harvesting energy
	new A.Harvest<SequenceContext>().continue().setCallback(c => c.task.source),
	// continue upgrading controller
	new A.UpgradeController<SequenceContext>().continue().setCallback(c => c.task.controller),
	// withdraw from container
	new A.Withdraw<SequenceContext>().setCallback(c => c.task.container),
	// pickup stray energy
	new A.Pickup<SequenceContext>().setCallback(c => findNearbyEnergy(c.creep.pos)),
	// init harvest
	new A.Harvest<SequenceContext>().setCallback(c => c.task.source),
	// init upgrade controller
	new A.UpgradeController<SequenceContext>().setCallback(c => c.task.controller),
];

export class TaskUpgradeController extends Task {
	static className = 'TaskUpgradeController' as Id<typeof Task>;

	readonly room: Room;
	readonly controller?: StructureController;
	readonly container?: StructureContainer;
	readonly source?: Source;

	constructor(roomName: Id<TaskUpgradeController>) {
		super(TaskUpgradeController, roomName);
		this.room = Game.rooms[roomName];
		this.controller = Game.rooms[roomName]?.controller;
		this.container = getWithCallback(objectServerCache, `${this.id}.container`, 50, findContainer, this.controller?.pos) as StructureContainer;
		this.source = getWithCallback(objectServerCache, `${this.id}.source`, 50, findSource, this.controller?.pos) as Source;
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

function findContainer(controllerPos: RoomPosition): StructureContainer {
	return controllerPos?.findClosestByPath(FIND_STRUCTURES, { filter: s => isConcreteStructure(s, STRUCTURE_CONTAINER) }) as StructureContainer;
}

function findSource(controllerPos: RoomPosition): Source {
	return findMinBy(findSources(Game.rooms[controllerPos.roomName]), s => s.pos.getRangeTo(controllerPos));
}
