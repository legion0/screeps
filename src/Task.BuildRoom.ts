import { recycle } from './Action';
import { findMinBy } from './Array';
import { createBodySpec } from './BodySpec';
import { GENERIC_WORKER } from './constants';
import { findEnergySourceForBuilder, getBuildCreepBodyForEnergy, runBuilderCreep } from './creep.builder';
import { log } from './Logger';
import { findStorageContainerPosition, nextExtensionPos } from './room_layout';
import { BuildQueuePriority, constructionQueueSize, currentConstruction, findMyConstructionSites, findStructuresByType, getRoomStorageLoad, requestConstruction } from './Room';
import { lookForConstructionAt, lookForStructureAt, toMemoryRoom } from './RoomPosition';
import { BodyPartsCallback, SpawnQueue, SpawnQueuePriority, SpawnRequest } from './SpawnQueue';
import { Task } from './Task';
import { everyN } from './Tick';

const kMaxBuildersPerRoom = 3;

export class TaskBuildRoom extends Task {
	static readonly className = 'BuildRoom' as Id<typeof Task>;

	readonly roomName: string;

	readonly room?: Room;
	readonly constructionSite?: ConstructionSite;
	private constructionQueueSize: number;
	private fakeCreep: Creep;

	constructor(roomName: Id<TaskBuildRoom>) {
		super(TaskBuildRoom, roomName);
		this.roomName = roomName;
		this.room = Game.rooms[roomName];
		this.constructionSite = currentConstruction(this.room.name) ?? findMinBy(findMyConstructionSites(this.room), (s: ConstructionSite) => toMemoryRoom(s.pos));
		this.constructionQueueSize = constructionQueueSize(this.room.name);
		this.fakeCreep = {
			pos: this.room.controller.pos,
			room: this.room,
			memory: {},
		} as any as Creep;
	}

	protected run() {
		// use containers as proxy for room age/ability
		if (findStructuresByType(this.room, STRUCTURE_CONTAINER).length == 0) {
			return;
		}

		// Create storage container
		everyN(20, () => {
			maybeBuildStorageContainer(this.room);
		});

		// Create new extensions
		everyN(20, () => {
			for (const pos of nextExtensionPos(this.room)) {
				const rv = requestConstruction(pos, STRUCTURE_EXTENSION, BuildQueuePriority.EXTENSION);
				if (rv !== OK && rv !== ERR_NAME_EXISTS) {
					log.e(`Failed to request STRUCTURE_EXTENSION at [${pos}]`);
				}
			}
		});

		// Spawn builder
		everyN(20, () => {
			const numCreeps = Math.min(Math.ceil(this.constructionQueueSize / 5000), kMaxBuildersPerRoom);
			for (const name of this.creepNames(numCreeps)) {
				const creep = Game.creeps[name];
				if (!(creep || SpawnQueue.getSpawnQueue().has(name)) && findEnergySourceForBuilder(this.fakeCreep)) {
					SpawnQueue.getSpawnQueue().push(buildSpawnRequest(this.room, name, Game.time));
				}
			}
		});

		for (const name of this.creepNames(kMaxBuildersPerRoom)) {
			const creep = Game.creeps[name];
			if (!creep) {
				continue;
			}
			if (getRoomStorageLoad(this.room, RESOURCE_ENERGY) > 0.3) {
				runBuilderCreep(creep, this.constructionSite);
			} else {
				recycle(creep);
			}
		}
	}

	private creepNames(numCreeps: number): string[] {
		return _.range(0, numCreeps).map((i) => `${this.id}.${i}`);
	}

	static create(roomName: string) {
		const rv = Task.createBase(TaskBuildRoom, roomName as Id<Task>);
		if (rv !== OK) {
			return rv;
		}
		return new TaskBuildRoom(roomName as Id<TaskBuildRoom>);
	}
}

function maybeBuildStorageContainer(room: Room) {
	const pos = findStorageContainerPosition(room);
	if (!pos) {
		return;
	}
	const container = lookForStructureAt(STRUCTURE_CONTAINER, pos) ?? lookForConstructionAt(STRUCTURE_CONTAINER, pos);
	if (container) {
		return;
	}
	const rv = requestConstruction(pos, STRUCTURE_CONTAINER, BuildQueuePriority.STORAGE_CONTAINER);
	if (rv !== OK) {
		log.e(`Failed to request STRUCTURE_CONTAINER at [${pos}]`);
	}
}

const bodySpec = createBodySpec([
	[WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
	GENERIC_WORKER,
]);

function buildSpawnRequest(room: Room, name: string, time: number): SpawnRequest {
	return {
		name,
		bodyPartsCallbackName: bodyPartsCallbackName,
		priority: SpawnQueuePriority.BUILDER,
		time: time,
		pos: room.controller.pos,
		context: {
			roomName: room.name,
		}
	};
}
function bodyPartsCallback(request: SpawnRequest, maxEnergy: number): BodyPartConstant[] {
	return getBuildCreepBodyForEnergy(maxEnergy);
}

const bodyPartsCallbackName = 'BuilderCreep' as Id<BodyPartsCallback>;

SpawnQueue.registerBodyPartsCallback(bodyPartsCallbackName, bodyPartsCallback);

Task.register.registerTaskClass(TaskBuildRoom);
