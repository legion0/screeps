import * as A from './Action';
import { isWithdrawTarget, WithdrawTarget } from './Action';
import { createBodySpec, getBodyForRoom } from './BodySpec';
import { GENERIC_WORKER } from './constants';
import { log } from './Logger';
import { nextExtensionPos } from './Planning';
import { BuildQueuePriority, constructionQueueSize, currentConstruction, findRoomSource, requestConstruction, findMyConstructionSites, findStructuresByType } from './Room';
import { findNearbyEnergy, toMemoryRoom } from './RoomPosition';
import { elapsed } from './ServerCache';
import { BodyPartsCallback, SpawnQueue, SpawnQueuePriority, SpawnRequest } from './SpawnQueue';
import { Task } from './Task';
import { everyN } from './Tick';
import { findMinBy } from './Array';
import { CreepPair } from './creep_pair';

interface SequenceContext {
	creep: Creep;
	task: TaskBuildRoom;
}

const sequence = [
	new A.Build<SequenceContext>().setArgs((c) => c.task.constructionSite),
	new A.Pickup<SequenceContext>().setArgs((c) => findNearbyEnergy(c.creep.pos)),
	new A.Withdraw<SequenceContext>().setArgs((c) => c.task.withdrawTarget),
	new A.Harvest<SequenceContext>().setArgs((c) => c.task.harvestTarget).setPersist(),
];

const kMaxBuildersPerRoom = 3;

export class TaskBuildRoom extends Task {
	static readonly className = 'BuildRoom' as Id<typeof Task>;

	readonly roomName: string;

	readonly room?: Room;

	readonly constructionSite?: ConstructionSite;

	private constructionQueueSize: number;

	readonly withdrawTarget?: WithdrawTarget;

	readonly harvestTarget?: Source;

	constructor(roomName: Id<TaskBuildRoom>) {
		super(TaskBuildRoom, roomName);
		this.roomName = roomName;
		this.room = Game.rooms[roomName];
		this.constructionSite = currentConstruction(this.room.name) ?? findMinBy(findMyConstructionSites(this.room), (s: ConstructionSite) => toMemoryRoom(s.pos));
		this.constructionQueueSize = constructionQueueSize(this.room.name);
		const roomSource = findRoomSource(this.room);
		if (isWithdrawTarget(roomSource)) {
			this.withdrawTarget = roomSource;
		} else if (roomSource instanceof Source) {
			this.harvestTarget = roomSource;
		}
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

		const numCreeps = Math.min(Math.ceil(this.constructionQueueSize / 5000), kMaxBuildersPerRoom);
		const noMoreBuilding = elapsed(`${this.id}.lastBuild`, 10, Boolean(this.constructionSite));

		for (const name of this.creepNames(numCreeps)) {
			const creepPair = new CreepPair(name);
			everyN(20, () => {
				if (creepPair.getActiveCreepTtl() < 50) {
					SpawnQueue.getSpawnQueue().has(creepPair.getSecondaryCreepName())
						|| SpawnQueue.getSpawnQueue().push(
							buildSpawnRequest(this.room, creepPair.getSecondaryCreepName(),
								Game.time + creepPair.getActiveCreepTtl()));
				}
			});
		}

		for (const name of this.creepNames(kMaxBuildersPerRoom)) {
			const creepPair = new CreepPair(name);
			for (const creep of creepPair.getLiveCreeps()) {
				if (noMoreBuilding) {
					A.recycle(creep);
				}
				A.runSequence(sequence, creep, { creep, task: this });
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

function bodyPartsCallback(request: SpawnRequest): BodyPartConstant[] {
	if (Object.keys(Game.creeps).length == 0) {
		return bodySpec[bodySpec.length - 1].body;
	}
	return getBodyForRoom(Game.rooms[request.context.roomName], bodySpec);
}

const bodyPartsCallbackName = 'BuilderCreep' as Id<BodyPartsCallback>;

SpawnQueue.registerBodyPartsCallback(bodyPartsCallbackName, bodyPartsCallback);

Task.register.registerTaskClass(TaskBuildRoom);
