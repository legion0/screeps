import * as Action from './Action';
import { Task } from './Task';
import { TaskBootSource } from './Task.BootSource';
import { Role } from './Role';
import { lookNear } from './RoomPosition';

const sequence = [
	// harvest energy
	new Action.Harvest<SequenceContext>().setPersist().setCallback(context => context.task.source),
	// fill up spawn asap
	new Action.TransferEnergy<SequenceContext>().setCallback(context => context.task.spawn),
	// build container
	new Action.Build<SequenceContext>().setPersist().setCallback(context => context.task.constructionSite),
	// repair container
	new Action.Repair<SequenceContext>().setPersist().setCallback(context => context.task.container),
	// pickup stray energy
	new Action.Pickup<SequenceContext>().setCallback(context => context.getResource()),
	// init build container
	new Action.Build<SequenceContext>().setCallback(context => context.task.constructionSite),
	// init repair container
	new Action.Repair<SequenceContext>().setCallback(context => context.task.container),
	// transfer to container
	new Action.TransferEnergy<SequenceContext>().setCallback(context => context.task.container),
	// init harvest
	new Action.Harvest<SequenceContext>().setCallback(context => context.task.source),
];

class SequenceContext {
	private creep: Creep;
	task: TaskBootSource;
	private source?: Source;
	private target?: StructureSpawn | StructureContainer | ConstructionSite | RoomPosition;
	private spawn?: StructureSpawn;
	private resource?: Resource;

	constructor(creep: Creep, task: TaskBootSource) {
		this.creep = creep;
		this.task = task;
	}

	getResource() {
		return this.resource != undefined ? this.resource : this.resource = lookNear(this.creep.pos, LOOK_ENERGY)[0] ?? null;
	}

}

export class RoleBoot extends Role {
	static readonly className = 'Boot' as Id<typeof Role>;

	private task: TaskBootSource;

	constructor(creep: Creep) {
		super(creep);
		this.task = Task.load(this.creep.memory.task) as TaskBootSource;
	}

	run() {
		Action.runSequence(sequence, this.creep, new SequenceContext(this.creep, this.task));
	}
}

Role.register.registerRole(RoleBoot);
