import { createBodySpec, getBodyForRoom } from './BodySpec';
import { errorCodeToString } from './constants';
import { getBootCreepBodyForEnergy, runBootCreep } from './creep.boot';
import { CreepPair } from './creep_pair';
import { Highway } from './Highway';
import { log } from './Logger';
import { findMySpawns, RoomSync } from './Room';
import { posKey } from './RoomPosition';
import { BodyPartsCallback, SpawnQueue, SpawnQueuePriority, SpawnRequest } from './SpawnQueue';
import { getEnergyAvailableForSpawn, getEnergyCapacityForSpawn } from './structure.spawn.energy';
import { Task } from './Task';
import { everyN } from './Tick';


export class TaskHarvestSource extends Task {
	static readonly className = 'HarvestSource' as Id<typeof Task>;

	readonly source: Source;
	readonly container?: StructureContainer;
	readonly constructionSite?: ConstructionSite<STRUCTURE_CONTAINER>;
	readonly roomSync?: RoomSync;

	constructor(sourceId: Id<TaskHarvestSource>) {
		super(TaskHarvestSource, sourceId);
		const source = Game.getObjectById(sourceId as unknown as Id<Source>);

		if (!source) {
			throw new Error(`TaskBootSource cannot find source [${sourceId}]`);
		}
		this.source = source;
		// TODO: Make a request to the harvester to transfer energy to the room sync.
	}

	protected run() {
		const creepBaseName = `harvest_${posKey(this.source.pos)}`;

		const creepPair = new CreepPair(creepBaseName);
		everyN(20, () => {
			for (const spawn of findMySpawns(this.source.room)) {
				const highway = Highway.createHighway(this.source.pos, spawn.pos);
				if (highway instanceof Highway) {
					highway.buildRoad();
				} else {
					log.e(`Failed to build highway from source at [${this.source.pos}] to spawn at [${spawn.pos}] with error: [${errorCodeToString(highway)}]`);
				}
			}
			maybeSpawnNewHarvester(creepPair, this.source.room, this.source.pos);
		});

		for (const creep of creepPair.getLiveCreeps()) {
			runBootCreep(creep, this.source);
		}
	}

	static create(source: Source) {
		const rv = Task.createBase(TaskHarvestSource, source.id as unknown as Id<Task>);
		if (rv !== OK) {
			return rv;
		}
		return new TaskHarvestSource(source.id as unknown as Id<TaskHarvestSource>);
	}
}

function maybeSpawnNewHarvester(creepPair: CreepPair, room: Room, pos: RoomPosition) {
	if (creepPair.getActiveCreepTtl() > 100) {
		return;
	}
	if (creepPair.getSecondaryCreep()) {
		return;
	}
	if (SpawnQueue.getSpawnQueue().has(creepPair.getActiveCreepName())
		|| SpawnQueue.getSpawnQueue().has(creepPair.getSecondaryCreepName())) {
		return;
	}

	SpawnQueue.getSpawnQueue().push(
		buildSpawnRequest(room, creepPair.getSecondaryCreepName(),
			pos, Game.time + creepPair.getActiveCreepTtl()));
}

export function hasHarvestCreeps(room: Room): boolean {
	return Object.values(Game.creeps).filter(creep => (creep.name.startsWith('harvest_')) && creep.pos.roomName == room.name).length != 0;
}

Task.register.registerTaskClass(TaskHarvestSource);

function buildSpawnRequest(room: Room, name: string, sourcePos: RoomPosition, time: number): SpawnRequest {
	return {
		name,
		bodyPartsCallbackName: bodyPartsCallbackName,
		priority: SpawnQueuePriority.BOOT,
		time: time,
		pos: sourcePos,
		context: {
			roomName: room.name,
		},
	};
}

function bodyPartsCallback(request: SpawnRequest, maxEnergy: number): BodyPartConstant[] {
	return getBootCreepBodyForEnergy(maxEnergy);
}

const bodyPartsCallbackName = 'BootCreep' as Id<BodyPartsCallback>;

SpawnQueue.registerBodyPartsCallback(bodyPartsCallbackName, bodyPartsCallback);
