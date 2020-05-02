import { Job } from "./Job";
import { everyN } from "./Tick";
import { serverCache } from "./ServerCache";

interface JobBootSourceMemory {
	sourceId: Id<Source>;
}

export class JobBootSource extends Job {
	static className = 'JobBootSource';

	private source: Source;

	constructor(id: Id<Job>, memory: JobBootSourceMemory) {
		super(id);
		this.source = Game.getObjectById(memory.sourceId);
	}

	protected run() {
		everyN(5, () => {
			let numCreeps = Math.min(this.source.pos.getClearance(), 3);
			for (let i = 0; i < numCreeps; i++) {
				let name = `${this.id}.${i}`;
				if (!(name in Game.creeps)) {
					let spawn = this.source.room.find(FIND_MY_SPAWNS).first();
					spawn.queueCreep();
				}
			}
		});
	}

	static create(source: Source) {
		let id = `BootSource.${source.id}` as Id<Job>;
		let rv = Job.createBase(JobBootSource, id);
		if (rv != OK) {
			return rv;
		}
		let memory = Memory.jobs[id] as JobBootSourceMemory;
		memory.sourceId = source.id;
		return new JobBootSource(id, memory);
	}
}

Job.register.registerJobClass(JobBootSource);
