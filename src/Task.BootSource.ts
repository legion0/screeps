import { MutatingCacheService, ObjectCacheService, objectServerCache } from "./Cache";
import { errorCodeToString, TERRAIN_PLAIN } from "./constants";
import { log } from "./Logger";
import { RoleBoot } from "./Role.Boot";
import { findMySpawns, requestCreepSpawn, SpawnQueuePriority } from "./Room";
import { fromMemory, getClearance, lookNear, posNear, RoomPositionMemory, toMemory } from "./RoomPosition";
import { isConcreteStructure, isConstructionSiteForStructure } from "./Structure";
import { Task } from "./Task";
import { everyN } from "./Tick";

declare global {
	interface CreepMemory {
		task?: Id<Task>;
		role?: string;
	}
}

export class TaskBootSource extends Task {
	static readonly className = 'BootSource' as Id<typeof Task>;

	readonly source: Source;
	readonly spawn?: StructureSpawn;
	readonly container?: StructureContainer;
	readonly constructionSite?: ConstructionSite<STRUCTURE_CONTAINER>;

	private readonly memory: ObjectCacheService<any>;

	constructor(sourceId: Id<TaskBootSource>) {
		super(TaskBootSource, sourceId);
		this.source = Game.getObjectById(sourceId as unknown as Id<Source>);

		if (this.source) {
			this.spawn = objectServerCache.getWithCallback(`${this.id}.spawn`, 50, findSpawn, this.source.room) as StructureSpawn;
			this.container = objectServerCache.getWithCallback(`${this.id}.container`, 50, findContainer, this.source.pos) as StructureContainer;
			this.constructionSite = objectServerCache.getWithCallback(`${this.id}.constructionSite`, 50, findConstructionSite, this.source.pos) as ConstructionSite<STRUCTURE_CONTAINER>;
			this.maybePlaceContainer();
		} else {
			if (!this.source) {
				this.remove();
			}
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
							task: this.id,
							role: RoleBoot.className,
						}
					}
				}));
			}
		});
	}

	static create(source: Source) {
		let rv = Task.createBase(TaskBootSource, source.id as unknown as Id<Task>);
		if (rv != OK) {
			return rv;
		}
		return new TaskBootSource(source.id as unknown as Id<TaskBootSource>);
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

Task.register.registerTaskClass(TaskBootSource);

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
