import * as A from './Action';
import { getWithCallback, MutatingCacheService, ObjectCacheService, objectServerCache } from "./Cache";
import { errorCodeToString, TERRAIN_PLAIN } from "./constants";
import { log } from "./Logger";
import { findMySpawns, findRoomSync, requestCreepSpawn, SpawnQueuePriority } from "./Room";
import { findNearbyEnergy, fromMemory, getClearance, lookNear, posNear, RoomPositionMemory, toMemory } from "./RoomPosition";
import { isConcreteStructure, isConstructionSiteForStructure, isSpawnOrExtension } from "./Structure";
import { Task } from "./Task";
import { everyN } from "./Tick";

interface SequenceContext {
	creep: Creep;
	task: TaskBootSource;
}

const bootCreepActions = [
	new A.Deposit<SequenceContext>().setArgs(c => c.task.spawnOrExt),
	new A.Build<SequenceContext>().setArgs(c => c.task.constructionSite),
	new A.Repair<SequenceContext>().setArgs(c => c.task.container),
	new A.Pickup<SequenceContext>().setArgs(c => findNearbyEnergy(c.creep.pos)),
	new A.Deposit<SequenceContext>().setArgs(c => c.task.container),
	new A.Withdraw<SequenceContext>().setArgs(c => c.task.source).setPersist(),
];

export class TaskBootSource extends Task {
	static readonly className = 'BootSource' as Id<typeof Task>;

	readonly source: Source;
	readonly spawnOrExt?: StructureSpawn | StructureExtension;
	readonly container?: StructureContainer;
	readonly constructionSite?: ConstructionSite<STRUCTURE_CONTAINER>;

	private readonly cache = new ObjectCacheService<any>(this);

	constructor(sourceId: Id<TaskBootSource>) {
		super(TaskBootSource, sourceId);
		this.source = Game.getObjectById(sourceId as unknown as Id<Source>);
		let roomSync = findRoomSync(this.source.room);
		this.spawnOrExt = isSpawnOrExtension(roomSync) ? roomSync : null;

		this.container = getWithCallback(objectServerCache, `${this.id}.container`, 50, findContainer, this.source.pos) as StructureContainer;
		this.constructionSite = getWithCallback(objectServerCache, `${this.id}.constructionSite`, 50, findConstructionSite, this.source.pos) as ConstructionSite<STRUCTURE_CONTAINER>;
		this.maybePlaceContainer();
	}

	protected run() {
		let numCreeps = Math.min(getClearance(this.source.pos), 3);
		for (let name of _.range(0, numCreeps).map(i => `${this.id}.${i}`)) {
			let creep = Game.creeps[name];
			if (creep) {
				A.runSequence(bootCreepActions, creep, { creep: creep, task: this });
			} else {
				everyN(20, () => {
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
