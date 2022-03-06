import { createBodySpec, getBodyForRoom } from './BodySpec';
import { getBootCreepBodyForEnergy, runBootCreep } from './creep.boot';
import { CreepPair } from './creep_pair';
import { RoomSync } from './Room';
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
		const name = `${this.id}.harvest`;

		const creepPair = new CreepPair(name);
		everyN(20, () => {
			if (creepPair.getActiveCreepTtl() < 50) {
				SpawnQueue.getSpawnQueue().has(creepPair.getSecondaryCreepName())
					|| creepPair.getSecondaryCreep()?.spawning
					|| SpawnQueue.getSpawnQueue().push(
						buildSpawnRequest(this.source.room, creepPair.getSecondaryCreepName(),
							this.source.pos, Game.time + creepPair.getActiveCreepTtl()));
			}
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

export function hasHarvestCreeps(room: Room) {
	return Object.values(Game.creeps).filter(creep => (creep.name.endsWith('.harvest') || creep.name.endsWith('.harvest_alt')) && creep.pos.roomName == room.name).length;
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
