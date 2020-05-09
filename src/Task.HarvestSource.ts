import * as A from './Action';
import { getWithCallback, MutatingCacheService, ObjectCacheService, objectServerCache } from "./Cache";
import { errorCodeToString, TERRAIN_PLAIN } from "./constants";
import { log } from "./Logger";
import { findRoomSync, requestCreepSpawn, RoomSync, SpawnQueuePriority, SpawnQueueItem } from "./Room";
import { findNearbyEnergy, fromMemory, lookNear, posNear, RoomPositionMemory, toMemory } from "./RoomPosition";
import { isConcreteStructure, isConstructionSiteForStructure, isContainer } from "./Structure";
import { Task } from "./Task";
import { everyN } from "./Tick";

interface SequenceContext {
	creep: Creep;
	task: TaskHarvestSource;
}

const harvestCreepActions = [
	new A.Build<SequenceContext>().setArgs(c => c.task.constructionSite),
	new A.Repair<SequenceContext>().setArgs(c => c.task.container),
	new A.Pickup<SequenceContext>().setArgs(c => findNearbyEnergy(c.creep.pos)),
	new A.Deposit<SequenceContext>().setArgs(c => c.task.container),
	new A.Withdraw<SequenceContext>().setArgs(c => c.task.source).setPersist(),
];

const haulCreepActions = [
	new A.Deposit<SequenceContext>().setArgs(c => c.task.roomSync),
	new A.Withdraw<SequenceContext>().setArgs(c => c.task.container).setPersist(),
];

export class TaskHarvestSource extends Task {
	static readonly className = 'HarvestSource' as Id<typeof Task>;

	readonly source: Source;
	readonly container?: StructureContainer;
	readonly constructionSite?: ConstructionSite<STRUCTURE_CONTAINER>;
	readonly roomSync?: RoomSync;

	private readonly cache = new ObjectCacheService<any>(this);

	constructor(sourceId: Id<TaskHarvestSource>) {
		super(TaskHarvestSource, sourceId);
		this.source = Game.getObjectById(sourceId as unknown as Id<Source>);
		this.container = getWithCallback(objectServerCache, `${this.id}.container`, 50, findContainer, this.source.pos) as StructureContainer;
		this.constructionSite = getWithCallback(objectServerCache, `${this.id}.constructionSite`, 50, findConstructionSite, this.source.pos) as ConstructionSite<STRUCTURE_CONTAINER>;
		this.roomSync = findRoomSync(this.source.room);
		if (isContainer(this.roomSync)) {
			this.roomSync = null;
		}
		this.maybePlaceContainer();
	}

	protected run() {
		let name = `${this.id}.harvest`;
		let creep = Game.creeps[name];
		if (creep) {
			A.runSequence(harvestCreepActions, creep, { creep: creep, task: this });
		} else {
			everyN(20, () => {
				requestCreepSpawn(this.source.room, name, harvesterSpawnCallback);
			});
		}
		name = `${this.id}.haul`;
		creep = Game.creeps[name];
		if (creep) {
			A.runSequence(haulCreepActions, creep, { creep: creep, task: this });
		} else {
			everyN(20, () => {
				requestCreepSpawn(this.source.room, name, haulerSpawnCallback);
			});
		}
	}

	static create(source: Source) {
		let rv = Task.createBase(TaskHarvestSource, source.id as unknown as Id<Task>);
		if (rv != OK) {
			return rv;
		}
		return new TaskHarvestSource(source.id as unknown as Id<TaskHarvestSource>);
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

Task.register.registerTaskClass(TaskHarvestSource);

function findContainer(pos: RoomPosition) {
	return (lookNear(pos, LOOK_STRUCTURES, s => isConcreteStructure(s, STRUCTURE_CONTAINER))[0] ?? null) as StructureContainer;
}

function findConstructionSite(pos: RoomPosition) {
	return (lookNear(pos, LOOK_CONSTRUCTION_SITES, s => isConstructionSiteForStructure(s, STRUCTURE_CONTAINER))[0] ?? null) as ConstructionSite<STRUCTURE_CONTAINER>;
}

function findContainerPos(sourcePos: RoomPosition) {
	return posNear(sourcePos, /*includeSelf=*/false).find(isPosGoodForContainer);
}

function isPosGoodForContainer(pos: RoomPosition) {
	return pos.lookFor(LOOK_CONSTRUCTION_SITES).length == 0 &&
		pos.lookFor(LOOK_TERRAIN)[0] == TERRAIN_PLAIN &&
		pos.lookFor(LOOK_STRUCTURES).length == 0;
}

function harvesterSpawnCallback(room: Room, name: string): SpawnQueueItem {
	let body: BodyPartConstant[] = [];
	if (room.energyCapacityAvailable >= 550) {
		body = [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE];
	} else {
		body = [WORK, CARRY, MOVE, MOVE];
	}

	let cost = _.sum(body, part => BODYPART_COST[part]);
	return {
		priority: SpawnQueuePriority.HARVESTER,
		name: name,
		body: body,
		cost: cost,
	};
}

function haulerSpawnCallback(room: Room, name: string): SpawnQueueItem {
	let body: BodyPartConstant[] = [];
	if (room.energyCapacityAvailable >= 550) {
		body = [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE];
	} else {
		body = [WORK, CARRY, MOVE, MOVE];
	}

	let cost = _.sum(body, part => BODYPART_COST[part]);
	return {
		priority: SpawnQueuePriority.HAULER,
		name: name,
		body: body,
		cost: cost,
	};
}