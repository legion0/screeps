import { CachedProperty } from "./Cache";
import { errorCodeToString, TERRAIN_PLAIN } from "./constants";
import { Job } from "./Job";
import { log } from "./Logger";
import { RoleBoot } from "./Role.Boot";
import { findMySpawns, requestCreepSpawn, SpawnQueuePriority } from "./Room";
import { fromMemory, getClearance, lookNear, posNear, RoomPositionMemory, toMemory } from "./RoomPosition";
import { isConcreteStructure, isConstructionSiteForStructure } from "./Structure";
import { everyN } from "./Tick";

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

	container = new CachedProperty<JobBootSource, StructureContainer>(this).setReaders([
		that => Game.getObjectById(that.memory.containerId),
		that => lookNear(that.source.pos, LOOK_STRUCTURES, s => isConcreteStructure(s, STRUCTURE_CONTAINER))[0] as StructureContainer
	]).setWriters([
		(value, that) => that.memory.containerId = value?.id
	]);

	constructionSite = new CachedProperty<JobBootSource, ConstructionSite<STRUCTURE_CONTAINER>>(this).setReaders([
		that => Game.getObjectById(that.memory.constructionSiteId),
		that => lookNear(that.source.pos, LOOK_CONSTRUCTION_SITES, s => isConstructionSiteForStructure(s, STRUCTURE_CONTAINER))[0] as ConstructionSite<STRUCTURE_CONTAINER>
	]).setWriters([
		(value, that) => that.memory.constructionSiteId = value?.id
	]);

	containerPos = new CachedProperty<JobBootSource, RoomPosition>(this).setReaders([
		that => fromMemory(that.memory.containerPos),
		that => posNear(that.source.pos, /*includeSelf=*/false).find(containerConstructionSitePositionValidator)
	]).setWriters([
		(value, that) => that.memory.containerPos = toMemory(value)
	]);

	spawn = new CachedProperty<JobBootSource, StructureSpawn>(this).setReaders([
		that => findMySpawns(that.source.room).find((s: StructureSpawn) => s.energy < s.energyCapacity)
	]);

	constructor(id: Id<Job>, memory: JobBootSourceMemory) {
		super(id);
		this.memory = memory;
		this.source = Game.getObjectById(memory.sourceId);

		this.maybePlaceContainer();

		if (!this.source) {
			this.remove();
		}
	}

	protected run() {
		everyN(5, () => {
			let numCreeps = Math.min(getClearance(this.source.pos), 3);
			for (let name of _.range(0, numCreeps).map(i => `${this.id}.${i}`)) {
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
		if (this.container.get() || this.constructionSite.get()) {
			return;
		}

		let containerPos = this.containerPos.get();
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
