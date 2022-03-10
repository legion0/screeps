import { recycle } from './Action';
import { findMinBy } from './Array';
import { createBodySpec, getBodyForRoom } from './BodySpec';
import { GENERIC_WORKER } from './constants';
import { getBuildCreepBodyForEnergy, runBuilderCreep } from './creep.builder';
import { CreepPair } from './creep_pair';
import { log } from './Logger';
import { nextExtensionPos } from './Planning';
import { BuildQueuePriority, constructionQueueSize, currentConstruction, findMyConstructionSites, findStructuresByType, getRoomStorageLoad, requestConstruction } from './Room';
import { toMemoryRoom } from './RoomPosition';
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

	constructor(roomName: Id<TaskBuildRoom>) {
		super(TaskBuildRoom, roomName);
		this.roomName = roomName;
		this.room = Game.rooms[roomName];
		this.constructionSite = currentConstruction(this.room.name) ?? findMinBy(findMyConstructionSites(this.room), (s: ConstructionSite) => toMemoryRoom(s.pos));
		this.constructionQueueSize = constructionQueueSize(this.room.name);
	}

	protected run() {
		// use containers as proxy for room age/ability
		if (findStructuresByType(this.room, STRUCTURE_CONTAINER).length == 0) {
			return;
		}

		// Create new extensions
		everyN(5, () => {
			for (const pos of nextExtensionPos(this.room)) {
				const rv = requestConstruction(pos, STRUCTURE_EXTENSION, BuildQueuePriority.EXTENSION);
				if (rv !== OK && rv !== ERR_NAME_EXISTS) {
					log.e(`Failed to request STRUCTURE_EXTENSION at [${pos}]`);
				}
			}
		});

		if (getRoomStorageLoad(this.room, RESOURCE_ENERGY) > 0.6) {
			const numCreeps = Math.min(Math.ceil(this.constructionQueueSize / 5000), kMaxBuildersPerRoom);
			for (const name of this.creepNames(numCreeps)) {
				const creep = Game.creeps[name];
				everyN(20, () => {
					if (!(creep || SpawnQueue.getSpawnQueue().has(name))) {
						SpawnQueue.getSpawnQueue().push(buildSpawnRequest(this.room, name, Game.time));
					}
				});
			}
		}

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
