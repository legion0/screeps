import { Job } from "./Job";
import { getClearance } from "./prototype.RoomPosition";
import { requestCreepSpawn, SpawnQueuePriority } from "./Room";
import { everyN } from "./Tick";
import { RoleBoot } from "./Role.Boot";

interface JobBootSourceMemory {
	sourceId: Id<Source>;
}

declare global {
	interface CreepMemory {
		job?: Id<Job>;
		role?: string;
	}
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
			let numCreeps = Math.min(getClearance(this.source.pos), 3);
			for (let i = 0; i < numCreeps; i++) {
				let name = `${this.id}.${i}`;
				if (!(name in Game.creeps)) {
					requestCreepSpawn(this.source.room, name, () => ({
						priority: SpawnQueuePriority.WORKER,
						name: name,
						body: [MOVE, CARRY, WORK],
						cost: BODYPART_COST[MOVE] + BODYPART_COST[CARRY] + BODYPART_COST[WORK],
						opts: {
							memory: {
								job: this.id,
								role: RoleBoot.className,
							}
						}
					}));
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

	getTarget(): StructureSpawn {
		return this.source.room.find(FIND_MY_SPAWNS).filter(s => s.energy < s.energyCapacity)[0];
	}

	getSource(): Source {
		return this.source;
	}

}

Job.register.registerJobClass(JobBootSource);
