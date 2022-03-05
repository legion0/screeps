import * as A from './Action';
import { createBodySpec, getBodyForRoom } from './BodySpec';
import { getActiveCreepTtl, isActiveCreepSpawning, getLiveCreepsAll } from './Creep';
import { findRoomSource, findStructuresByType, RoomSource } from './Room';
import { findNearbyEnergy, lookForConstructionAt, lookForStructureAt } from './RoomPosition';
import { SpawnQueue, SpawnRequest, SpawnQueuePriority } from './SpawnQueue';
import { Task } from './Task';
import { everyN } from './Tick';
import { GENERIC_WORKER } from './constants';


interface SequenceContext {
	creep: Creep;
	task: TaskUpgradeController;
}

const upgradeControllerActions = [
	new A.Build<SequenceContext>().setArgs((c) => lookForConstructionAt(STRUCTURE_ROAD, c.creep.pos)),
	new A.Repair<SequenceContext>().setArgs((c) => lookForStructureAt(STRUCTURE_ROAD, c.creep.pos)),
	new A.UpgradeController<SequenceContext>().setArgs((c) => c.task.controller).setHighway(),
	new A.Pickup<SequenceContext>().setArgs((c) => findNearbyEnergy(c.creep.pos)),
	new A.Pickup<SequenceContext>().setArgs((c) => c.task.pickupTarget),
	new A.Withdraw<SequenceContext>().setArgs((c) => c.task.withdrawTarget).setHighway(),
	new A.Harvest<SequenceContext>().setArgs((c) => c.task.harvestTarget).setPersist(),
];

export class TaskUpgradeController extends Task {
	static className = 'UpgradeController' as Id<typeof Task>;

	readonly room: Room;

	readonly controller?: StructureController;

	readonly roomSource: RoomSource;

	readonly withdrawTarget?: A.WithdrawTarget;

	readonly pickupTarget?: A.PickupTarget;

	readonly harvestTarget?: Source;

	constructor(roomName: Id<TaskUpgradeController>) {
		super(TaskUpgradeController, roomName);
		this.room = Game.rooms[roomName];
		if (this.room && !this.room.controller) {
			throw new Error(`No Controller in room [${roomName}]`);
		}
		this.controller = this.room?.controller;
		const roomSource = findRoomSource(this.room);
		if (A.isPickupTarget(roomSource)) {
			this.pickupTarget = roomSource;
		} else if (A.isWithdrawTarget(roomSource)) {
			this.withdrawTarget = roomSource;
		} else if (roomSource instanceof Source) {
			this.harvestTarget = roomSource;
		}
	}

	protected run() {
		everyN(20, () => {
			for (const name of this.creepNames()) {
				if (getActiveCreepTtl(name) > 50 || isActiveCreepSpawning(name)) {
					continue;
				}
				const queue = SpawnQueue.getSpawnQueue();
				queue.has(name) || queue.push(buildSpawnRequest(this.room, name));
			}
		});

		for (const creep of getLiveCreepsAll(this.creepNames())) {
			A.runSequence(upgradeControllerActions, creep, { creep, task: this });
		}
	}

	private creepNames(): string[] {
		let numCreeps = 1;
		// use containers as proxy for room age/ability
		if (findStructuresByType(this.room, STRUCTURE_CONTAINER).length > 0) {
			numCreeps = 3;
		}
		return _.range(0, numCreeps).map((i) => `${this.id}.${i}`);
	}

	static create(roomName: string) {
		const rv = Task.createBase(TaskUpgradeController, roomName as Id<Task>);
		if (rv !== OK) {
			return rv;
		}
		return new TaskUpgradeController(roomName as Id<TaskUpgradeController>);
	}
}

const bodySpec = createBodySpec([
	[WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
	GENERIC_WORKER,
]);

function buildSpawnRequest(room: Room, name: string): SpawnRequest {
	return {
		name,
		body: getBodyForRoom(room, bodySpec),
		priority: SpawnQueuePriority.UPGRADER,
		time: Game.time + getActiveCreepTtl(name),
		pos: room.controller.pos,
	};
}

Task.register.registerTaskClass(TaskUpgradeController);
