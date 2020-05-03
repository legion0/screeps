import { Job } from "./Job";
import { getClearance, posNear, lookNear } from "./RoomPosition";
import { requestCreepSpawn, SpawnQueuePriority } from "./Room";
import { everyN } from "./Tick";
import { RoleBoot } from "./Role.Boot";
import { serverCache } from "./ServerCache";
import { isConcreteStructure, isWalkableStructure, isConstructionSiteForStructure } from "./Structure";
import { TERRAIN_PLAIN, errorCodeToString } from "./constants";
import { log } from "./Logger";

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
						body: [MOVE, MOVE, CARRY, WORK],
						cost: BODYPART_COST[MOVE] + BODYPART_COST[MOVE] + BODYPART_COST[CARRY] + BODYPART_COST[WORK],
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

	getTarget() {
		let spawn = serverCache.getObjects(`${this.source.room.name}.spawns`, 50, () => this.source.room.find(FIND_MY_SPAWNS))
			.find(s => s.energy < s.energyCapacity);
		if (spawn) {
			return spawn;
		}

		let container = serverCache.getObject(
			`${this.source.id}.container`,
			10,
			() => findContainerBy(this.source.pos));
		if (container) {
			if (container instanceof StructureContainer && container.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
				return null;
			}
			return container;
		}

		let containerPos = posNear(this.source.pos, /*includeSelf=*/false).find(containerConstructionSitePositionValidator);
		if (containerPos) {
			let rv = containerPos.createConstructionSite(STRUCTURE_CONTAINER);
			if (rv != OK) {
				log.e(`Failed to create STRUCTURE_CONTAINER at [${containerPos}] with error [${errorCodeToString(rv)}]`);
			}
	
			return containerPos;
		}
		return null;
	}

	getSource(): Source {
		return this.source;
	}
}

function findContainerBy(pos: RoomPosition) {
	return (lookNear(pos, LOOK_STRUCTURES, s => isConcreteStructure(s, STRUCTURE_CONTAINER))[0] as StructureContainer) ??
		(lookNear(pos, LOOK_CONSTRUCTION_SITES, s => isConstructionSiteForStructure(s, STRUCTURE_CONTAINER))[0] as ConstructionSite<STRUCTURE_CONTAINER>);
}

function containerConstructionSitePositionValidator(pos: RoomPosition) {
	return pos.lookFor(LOOK_CONSTRUCTION_SITES).length == 0 &&
		pos.lookFor(LOOK_TERRAIN)[0] == TERRAIN_PLAIN &&
		pos.lookFor(LOOK_STRUCTURES).length == 0;
}

Job.register.registerJobClass(JobBootSource);
