import * as Action from './Action';
import { Job } from './Job';
import { Role } from './Role';
import { lookNear } from './RoomPosition';
import { JobUpgradeController } from './Job.UpgradeController';

const sequence = [
	// continue harvest energy
	new Action.Harvest<SequenceContext>().setPersist().setCallback(context => context.job.source.get()),
	// continue upgrade controller
	new Action.UpgradeController<SequenceContext>().setPersist().setCallback(context => context.job.controller),
	// withdraw from container
	new Action.Withdraw<SequenceContext>().setCallback(context => context.job.container.get()),
	// pickup stray energy
	new Action.Pickup<SequenceContext>().setCallback(context => context.getResource()),
	// init harvest
	new Action.Harvest<SequenceContext>().setCallback(context => context.job.source.get()),
	// init upgrade controller
	new Action.UpgradeController<SequenceContext>().setCallback(context => context.job.controller),

];

class SequenceContext {
	private creep: Creep;
	job: JobUpgradeController;
	private resource?: Resource;

	constructor(creep: Creep, job: JobUpgradeController) {
		this.creep = creep;
		this.job = job;
	}

	getResource() {
		return this.resource != undefined ? this.resource : this.resource = lookNear(this.creep.pos, LOOK_ENERGY)[0] ?? null;
	}
}

export class RoleUpgrader extends Role {
	static className = 'RoleUpgrader';

	private job: JobUpgradeController;

	constructor(creep: Creep) {
		super(creep);
		this.job = Job.load(this.creep.memory.job) as JobUpgradeController;
	}

	run() {
		Action.runSequence(sequence, this.creep, new SequenceContext(this.creep, this.job));
	}
}

Role.register.registerRole(RoleUpgrader);
