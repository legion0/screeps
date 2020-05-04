import { errorCodeToString, TERRAIN_PLAIN } from "./constants";
import { Job } from "./Job";
import { log } from "./Logger";
import { RoleBoot } from "./Role.Boot";
import { requestCreepSpawn, SpawnQueuePriority } from "./Room";
import { fromMemory, getClearance, lookNear, posNear, RoomPositionMemory, toMemory } from "./RoomPosition";
import { serverCache } from "./ServerCache";
import { isConcreteStructure, isConstructionSiteForStructure } from "./Structure";
import { everyN } from "./Tick";
import { CachedProperty } from "./Cache";

interface JobBootSourceMemory {
	sourceId: Id<Source>;
	containerPos?: RoomPositionMemory;
	containerId?: Id<StructureContainer>;
	constructionSiteId?: Id<ConstructionSite<STRUCTURE_CONTAINER>>;
}

declare global {
	interface CreepMemory {
		job?: Id<Job>;
		role?: string;
	}
}

export class JobBootSource extends Job {
	static className = 'JobBootSource';

	private memory: JobBootSourceMemory;
	private source: Source;

	private static container = new CachedProperty<JobBootSource, StructureContainer>().setReaders([
		that => Game.getObjectById(that.memory.containerId),
		that => lookNear(that.source.pos, LOOK_STRUCTURES, s => isConcreteStructure(s, STRUCTURE_CONTAINER))[0] as StructureContainer
	]).setWriters([
		(value, that) => that.memory.containerId = value?.id
	]);

	private static constructionSite = new CachedProperty<JobBootSource, ConstructionSite<STRUCTURE_CONTAINER>>().setReaders([
		that => Game.getObjectById(that.memory.constructionSiteId),
		that => lookNear(that.source.pos, LOOK_CONSTRUCTION_SITES, s => isConstructionSiteForStructure(s, STRUCTURE_CONTAINER))[0] as ConstructionSite<STRUCTURE_CONTAINER>
	]).setWriters([
		(value, that) => that.memory.constructionSiteId = value?.id
	]);

	private static containerPos = new CachedProperty<JobBootSource, RoomPosition>().setReaders([
		that => fromMemory(that.memory.containerPos),
		that => posNear(that.source.pos, /*includeSelf=*/false).find(containerConstructionSitePositionValidator)
	]).setWriters([
		(value, that) => that.memory.containerPos = toMemory(value)
	]);

	private static spawn = new CachedProperty<JobBootSource, StructureSpawn>().setReaders([
		that => serverCache.getObjects(`${that.source.room.name}.spawns`, 50, () => that.source.room.find(FIND_MY_SPAWNS))
			.find(s => s.energy < s.energyCapacity),
	]);

	constructor(id: Id<Job>, memory: JobBootSourceMemory) {
		super(id);
		this.memory = memory;
		this.source = Game.getObjectById(memory.sourceId);

		this.maybePlaceContainer();
	}

	getContainer() {
		return JobBootSource.container.get(this);
	}

	getSpawn() {
		return JobBootSource.spawn.get(this);
	}

	getConstructionSite() {
		return JobBootSource.constructionSite.get(this);
	}

	protected run() {
		everyN(5, () => {
			let numCreeps = Math.min(getClearance(this.source.pos), 3);
			for (let name of _.range(0, numCreeps).map(i => `${this.id}.${i}`).filter(name => !(name in Game.creeps))) {
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

	getSource() {
		return this.source;
	}

	private maybePlaceContainer() {
		if (this.getContainer() || this.getConstructionSite()) {
			return;
		}

		let containerPos = JobBootSource.containerPos.get(this);
		let rv = containerPos?.createConstructionSite(STRUCTURE_CONTAINER);
		if (rv != OK) {
			log.e(`Failed to create STRUCTURE_CONTAINER at [${containerPos}] with error [${errorCodeToString(rv)}]`);
		}
	}
}

function containerConstructionSitePositionValidator(pos: RoomPosition) {
	return pos.lookFor(LOOK_CONSTRUCTION_SITES).length == 0 &&
		pos.lookFor(LOOK_TERRAIN)[0] == TERRAIN_PLAIN &&
		pos.lookFor(LOOK_STRUCTURES).length == 0;
}

Job.register.registerJobClass(JobBootSource);
