import { MutatingCacheService, ObjectCacheService, objectServerCache } from "./Cache";
import { errorCodeToString, TERRAIN_PLAIN } from "./constants";
import { Job } from "./Job";
import { log } from "./Logger";
import { RoleBoot } from "./Role.Boot";
import { requestCreepSpawn, SpawnQueuePriority, findMySpawns } from "./Room";
import { fromMemory, getClearance, lookNear, posNear, RoomPositionMemory, toMemory } from "./RoomPosition";
import { isConcreteStructure, isConstructionSiteForStructure } from "./Structure";
import { everyN } from "./Tick";

declare global {
	interface CreepMemory {
		job?: Id<Job>;
		role?: string;
	}
}

export class JobBootSource extends Job {
	static className = 'JobBootSource';

	source: Source;
	spawn: StructureSpawn;
	container?: StructureContainer;
	constructionSite?: ConstructionSite<STRUCTURE_CONTAINER>;

	private memory: ObjectCacheService<any>;

	constructor(id: Id<Job>, memory: any) {
		super(id);
		this.source = Game.getObjectById(memory.sourceId);
		this.memory = new ObjectCacheService<any>(memory);


		this.spawn = objectServerCache.getWithCallback(`${this.id}.spawn`, 50, findSpawn, this.source.room) as StructureSpawn;
		this.container = objectServerCache.getWithCallback(`${this.id}.container`, 50, findContainer, this.source.pos) as StructureContainer;
		this.constructionSite = objectServerCache.getWithCallback(`${this.id}.constructionSite`, 50, findConstructionSite, this.source.pos) as ConstructionSite<STRUCTURE_CONTAINER>;

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
		let memory = Memory.jobs[id];
		memory.sourceId = source.id;
		return new JobBootSource(id, memory);
	}

	getSource() {
		return this.source;
	}

	private maybePlaceContainer() {
		if (this.container || this.constructionSite) {
			return;
		}

		let posCache = new MutatingCacheService<RoomPosition, RoomPositionMemory>(this.memory, fromMemory, toMemory);
		let containerPos = posCache.getWithCallback(`containerPos`, 50, findContainerPos, this.source.pos);
		let rv = containerPos?.createConstructionSite(STRUCTURE_CONTAINER);
		if (rv != OK) {
			log.e(`Failed to create STRUCTURE_CONTAINER at [${containerPos}] with error [${errorCodeToString(rv)}]`);
		}
	}
}

Job.register.registerJobClass(JobBootSource);

function findContainer(pos: RoomPosition) {
	return (lookNear(pos, LOOK_STRUCTURES, s => isConcreteStructure(s, STRUCTURE_CONTAINER))[0] ?? null) as StructureContainer;
}

function findConstructionSite(pos: RoomPosition) {
	return (lookNear(pos, LOOK_CONSTRUCTION_SITES, s => isConstructionSiteForStructure(s, STRUCTURE_CONTAINER))[0] ?? null) as ConstructionSite<STRUCTURE_CONTAINER>;
}

function findContainerPos(sourcePos: RoomPosition) {
	return posNear(sourcePos, /*includeSelf=*/false).find(isPosGoodForContainer);
}

function findSpawn(room: Room): StructureSpawn {
	return findMySpawns(room)[0] ?? null;
}

function isPosGoodForContainer(pos: RoomPosition) {
	return pos.lookFor(LOOK_CONSTRUCTION_SITES).length == 0 &&
		pos.lookFor(LOOK_TERRAIN)[0] == TERRAIN_PLAIN &&
		pos.lookFor(LOOK_STRUCTURES).length == 0;
}
