import { MemInit } from "./Memory";
import { log } from "./Logger";

declare global {
	interface Memory {
		jobs: JobMemory[];
	}
}

interface JobClass<T extends typeof Job> extends Registerable<T> {
	new(id: Id<T>): T;
	load(id: Id<T>): T;
}

class JobClassRegister {
	private _register: { [key: string]: JobClass<any> };

	registerJobClass<T extends typeof Job>(jobClass: JobClass<T>) {
		this._register[jobClass.className] = jobClass;
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

abstract class Job {
	private id: Id<Job>;

	constructor(id: Id<Job>) {
		this.id = id;
	}

	abstract run(): void;

	static register: JobClassRegister = new JobClassRegister();

	remove() {
		delete Memory.jobs[this.id];
		return true;
	}

	// also required to be implemented by child classes.
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
		return jobClass.load(id) as Job;
	}

	static create<T extends typeof Job>(jobClass: JobClass<T>, id: Id<T>, memory: any) {
		MemInit(Memory, 'jobs', {});
		if (id in Memory.jobs) {
			return ERR_NAME_EXISTS;
		}
		memory = memory ?? {};
		memory.jobClassName = jobClass.className;
		Memory.jobs[id] = memory;
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
