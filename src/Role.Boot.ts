import * as Action from './Action';
import { Job } from './Job';
import { JobBootSource } from './Job.BootSource';
import { Role } from './Role';
import { lookNear } from './RoomPosition';

const sequence = [
	// harvest energy
	new Action.Harvest<SequenceContext>().setPersist().setCallback(context => context.job.getSource()),
	// fill up spawn asap
	new Action.TransferEnergy<SequenceContext>().setCallback(context => context.job.getSpawn()),
	// build container
	new Action.Build<SequenceContext>().setPersist().setCallback(context => context.job.getConstructionSite()),
	// repair container
	new Action.Repair<SequenceContext>().setPersist().setCallback(context => context.job.getContainer()),
	// pickup stray energy
	new Action.Pickup<SequenceContext>().setCallback(context => context.getResource()),
	// init build container
	new Action.Build<SequenceContext>().setCallback(context => context.job.getConstructionSite()),
	// init repair container
	new Action.Repair<SequenceContext>().setCallback(context => context.job.getContainer()),
	// transfer to container
	new Action.TransferEnergy<SequenceContext>().setCallback(context => context.job.getContainer()),
	// init harvest
	new Action.Harvest<SequenceContext>().setCallback(context => context.job.getSource()),
];

class SequenceContext {
	private creep: Creep;
	job: JobBootSource;
	private source?: Source;
	private target?: StructureSpawn | StructureContainer | ConstructionSite | RoomPosition;
	private spawn?: StructureSpawn;
	private resource?: Resource;

	constructor(creep: Creep, job: JobBootSource) {
		this.creep = creep;
		this.job = job;
	}

	getResource() {
		return this.resource != undefined ? this.resource : this.resource = lookNear(this.creep.pos, LOOK_ENERGY)[0] ?? null;
	}

}

export class RoleBoot extends Role {
	static className = 'RoleBoot';

	private job: JobBootSource;

	constructor(creep: Creep) {
		super(creep);
		this.job = Job.load(this.creep.memory.job) as JobBootSource;
	}

	run() {
		Action.runSequence(sequence, this.creep, new SequenceContext(this.creep, this.job));
	}
}

Role.register.registerRole(RoleBoot);
