import * as Action from './Action';
import { Task } from './Task';
import { TaskUpgradeController } from './Task.UpgradeController';
import { Role } from './Role';
import { lookNear } from './RoomPosition';

const sequence = [
	// continue harvest energy
	new Action.Harvest<SequenceContext>().setPersist().setCallback(context => context.task.source),
	// continue upgrade controller
	new Action.UpgradeController<SequenceContext>().setPersist().setCallback(context => context.task.controller),
	// withdraw from container
	new Action.Withdraw<SequenceContext>().setCallback(context => context.task.container),
	// pickup stray energy
	new Action.Pickup<SequenceContext>().setCallback(context => context.getResource()),
	// init harvest
	new Action.Harvest<SequenceContext>().setCallback(context => context.task.source),
	// init upgrade controller
	new Action.UpgradeController<SequenceContext>().setCallback(context => context.task.controller),

];

class SequenceContext {
	private creep: Creep;
	task: TaskUpgradeController;
	private resource?: Resource;

	constructor(creep: Creep, task: TaskUpgradeController) {
		this.creep = creep;
		this.task = task;
	}

	getResource() {
		return this.resource != undefined ? this.resource : this.resource = lookNear(this.creep.pos, LOOK_ENERGY)[0] ?? null;
	}
}

export class RoleUpgrader extends Role {
	static readonly className = 'Upgrader' as Id<typeof Role>;

	private task: TaskUpgradeController;

	constructor(creep: Creep) {
		super(creep);
		this.task = Task.load(this.creep.memory.task) as TaskUpgradeController;
	}

	run() {
		Action.runSequence(sequence, this.creep, new SequenceContext(this.creep, this.task));
	}
}

Role.register.registerRole(RoleUpgrader);
