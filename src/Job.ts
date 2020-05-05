import { EventEnum, events } from "./Events";
import { log } from "./Logger";
import { MemInit } from "./Memory";

declare global {
	interface Memory {
		jobs: JobMemory[];
	}
}

interface JobClass<T> extends Registerable {
	new(id: Id<Job>, memory: MemoryFor<T>): T;
}

class JobClassRegister {
	private _register: { [key: string]: JobClass<any> } = {};

	registerJobClass<T>(jobClass: JobClass<T>) {
		this._register[jobClass.className] = jobClass as any;
	}

	getJobClass(jobClassName: string) {
		let jobClass = this._register[jobClassName];
		if (!jobClass) {
			throw `Job class [${jobClassName}] is not in the job class register!`;
		}
		return jobClass;
	}
}

interface JobMemory {
	jobClassName: string;
}

export abstract class Job {
	protected readonly id: Id<Job>;

	protected constructor(id: Id<Job>) {
		this.id = id;
	}

	protected abstract run(): void;

	static register: JobClassRegister = new JobClassRegister();

	remove() {
		delete Memory.jobs[this.id];
	}

	static load(id: Id<Job>) {
		let memory = MemInit(Memory, 'jobs', {})[id] as JobMemory;
		if (!memory) {
			log.e(`Cannot find job with id [${id}]`);
			return null;
		}
		let jobClass = Job.register.getJobClass(memory.jobClassName);
		if (!jobClass) {
			log.e(`Cannot find class for jobClassName [${memory.jobClassName}]`);
			return null;
		}
		return new jobClass(id, memory) as Job;
	}

	protected static createBase<T>(jobClass: JobClass<T>, id: Id<T>) {
		MemInit(Memory, 'jobs', {});
		if (id in Memory.jobs) {
			return ERR_NAME_EXISTS;
		}
		Memory.jobs[id] = { jobClassName: jobClass.className };
		return OK;
	}

	static runAll() {
		MemInit(Memory, 'jobs', {});
		for (let id in Memory.jobs) {
			let memory = Memory.jobs[id];
			let job = Job.load(id as Id<Job>);
			if (job) {
				job.run();
			}
		}
	}
}

events.listen(EventEnum.HARD_RESET, () => {
	delete Memory.jobs;
});
