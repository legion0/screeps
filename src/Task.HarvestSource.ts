import { createBodySpec, getBodyForRoom } from './BodySpec';
import { getActiveCreepTtl, getLiveCreeps, isActiveCreepSpawning } from './Creep';
import { runBootCreep } from './creeps.boot';
import { RoomSync } from './Room';
import { BodyPartsCallback, SpawnQueue, SpawnQueuePriority, SpawnRequest } from './SpawnQueue';
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

		everyN(20, () => {
			if (getActiveCreepTtl(name) < 50 && !isActiveCreepSpawning(name)) {
				const queue = SpawnQueue.getSpawnQueue();
				queue.has(name) || queue.push(buildSpawnRequest(this.source.room, name, this.source.pos));
			}
		});

		for (const creep of getLiveCreeps(name)) {
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
	return Object.values(Game.creeps).filter(creep => creep.name.endsWith('.harvest') && creep.pos.roomName == room.name).length;
}

Task.register.registerTaskClass(TaskHarvestSource);

const bodySpec = createBodySpec([
	[WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE],
	[WORK, WORK, CARRY, MOVE],
]);

function buildSpawnRequest(room: Room, name: string, sourcePos: RoomPosition): SpawnRequest {
	return {
		name,
		bodyPartsCallbackName: bodyPartsCallbackName,
		priority: SpawnQueuePriority.BOOT,
		time: Game.time + getActiveCreepTtl(name),
		pos: sourcePos,
		context: {
			roomName: room.name,
		},
	};
}

function bodyPartsCallback(request: SpawnRequest): BodyPartConstant[] {
	let room = Game.rooms[request.context.roomName];
	if (!hasHarvestCreeps(room)) {
		return bodySpec[bodySpec.length - 1].body;
	}
	return getBodyForRoom(room, bodySpec);
}

const bodyPartsCallbackName = 'BootCreep' as Id<BodyPartsCallback>;

SpawnQueue.registerBodyPartsCallback(bodyPartsCallbackName, bodyPartsCallback);
