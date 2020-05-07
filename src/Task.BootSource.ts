import * as A from './Action';
import { getWithCallback, MutatingCacheService, ObjectCacheService, objectServerCache } from "./Cache";
import { errorCodeToString, TERRAIN_PLAIN } from "./constants";
import { log } from "./Logger";
import { findMySpawns, requestCreepSpawn, SpawnQueuePriority } from "./Room";
import { findNearbyEnergy, fromMemory, getClearance, lookNear, posNear, RoomPositionMemory, toMemory } from "./RoomPosition";
import { isConcreteStructure, isConstructionSiteForStructure } from "./Structure";
import { Task } from "./Task";
import { everyN } from "./Tick";

interface SequenceContext {
	creep: Creep;
	task: TaskBootSource;
}

const bootCreepActions = [
	// continue harvesting
	new A.Harvest<SequenceContext>().continue().setCallback(c => c.task.source),
	// fill up spawn asap
	new A.TransferEnergy<SequenceContext>().setCallback(c => c.task.spawn),
	// continue building container
	new A.Build<SequenceContext>().continue().setCallback(c => c.task.constructionSite),
	// continue repairing container
	new A.Repair<SequenceContext>().continue().setCallback(c => c.task.container),
	// pickup stray energy
	new A.Pickup<SequenceContext>().setCallback(c => findNearbyEnergy(c.creep.pos)),
	// init build container
	new A.Build<SequenceContext>().setCallback(c => c.task.constructionSite),
	// init repair container
	new A.Repair<SequenceContext>().setCallback(c => c.task.container),
	// transfer to container
	new A.TransferEnergy<SequenceContext>().setCallback(c => c.task.container),
	// init harvest
	new A.Harvest<SequenceContext>().setCallback(c => c.task.source),
];

export class TaskBootSource extends Task {
	static readonly className = 'BootSource' as Id<typeof Task>;

	readonly source: Source;
	readonly spawn?: StructureSpawn;
	readonly container?: StructureContainer;
	readonly constructionSite?: ConstructionSite<STRUCTURE_CONTAINER>;

	private readonly cache = new ObjectCacheService<any>(this);

	constructor(sourceId: Id<TaskBootSource>) {
		super(TaskBootSource, sourceId);
		this.source = Game.getObjectById(sourceId as unknown as Id<Source>);

		if (this.source) {
			this.spawn = getWithCallback(objectServerCache, `${this.id}.spawn`, 50, findSpawn, this.source.room) as StructureSpawn;
			this.container = getWithCallback(objectServerCache, `${this.id}.container`, 50, findContainer, this.source.pos) as StructureContainer;
			this.constructionSite = getWithCallback(objectServerCache, `${this.id}.constructionSite`, 50, findConstructionSite, this.source.pos) as ConstructionSite<STRUCTURE_CONTAINER>;
			this.maybePlaceContainer();
		} else {
			if (!this.source) {
				this.remove();
			}
		}
	}

	protected run() {
		let numCreeps = Math.min(getClearance(this.source.pos), 3);
		for (let name of _.range(0, numCreeps).map(i => `${this.id}.${i}`)) {
			let creep = Game.creeps[name];
			if (creep) {
				A.runSequence(bootCreepActions, creep, { creep: creep, task: this });
			} else {
				everyN(5, () => {
					requestCreepSpawn(this.source.room, name, () => ({
						priority: SpawnQueuePriority.WORKER,
						name: name,
						body: [MOVE, MOVE, CARRY, WORK],
						cost: BODYPART_COST[MOVE] + BODYPART_COST[MOVE] + BODYPART_COST[CARRY] + BODYPART_COST[WORK],
					}));
				});
			}
		}
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

		let posCache = new MutatingCacheService<RoomPosition, RoomPositionMemory>(this.cache, fromMemory, toMemory);
		let containerPos = getWithCallback(posCache, `containerPos`, 50, findContainerPos, this.source.pos);
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
