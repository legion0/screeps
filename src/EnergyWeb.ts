import * as A from './Action';
import { isPickupTarget, isWithdrawTarget, PickupTarget, TransferTarget, WithdrawTarget } from './Action';
import { createBodySpec, getBodyForRoom } from './BodySpec';
import { getActiveCreepTtl, getLiveCreeps, isActiveCreepSpawning } from './Creep';
import { EventEnum, events } from './Events';
import { memInit } from './Memory';
import { findMySpawnsOrExtensions, findRoomSource } from './Room';
import { findNearbyEnergy } from './RoomPosition';
import { SpawnQueue, SpawnQueuePriority, SpawnRequest } from './SpawnQueue';
import { getFreeCapacity } from './Store';
import { everyN } from './Tick';

declare global {
	interface Memory {
		energyWeb: {
			put: { [key: string]: EnergyRequest },
			take: { [key: string]: EnergyRequest },
		};
	}
}

enum EnergyTransferPriority {
	BASIC,
	URGENT,
}

interface EnergyRequest {
	dest: Id<TransferTarget>;
	amount: number;
	priority: EnergyTransferPriority;
}

interface SequenceContext {
	creep: Creep;
	transfer?: TransferTarget;
	pickup?: PickupTarget;
	withdraw?: WithdrawTarget;
}

const webHaulCreepActions = [
	new A.Pickup<SequenceContext>().setArgs((c) => findNearbyEnergy(c.creep.pos)),
	new A.Transfer<SequenceContext>().setArgs((c) => c.transfer),
	new A.Pickup<SequenceContext>().setArgs((c) => c.pickup),
	new A.Withdraw<SequenceContext>().setArgs((c) => c.withdraw),
];

class EnergyWeb {
	put(request: EnergyRequest) {
		Memory.energyWeb.put[request.dest] = request;
	}

	take(request: EnergyRequest) {
		Memory.energyWeb.take[request.dest] = request;
	}

	run() {
		this.placeTakeOrdersForSpawns();

		const haulerAssignments: { [key: string]: Partial<SequenceContext> } = {};

		for (const [key, request] of Object.entries(Memory.energyWeb.take)) {
			const dest = Game.getObjectById(request.dest);
			if (!dest) {
				delete Memory.energyWeb.take[key];
				continue;
			}
			const freeCapacity = getFreeCapacity(dest);
			if (freeCapacity === 0) {
				delete Memory.energyWeb.take[key];
				continue;
			}

			haulerAssignments[`${dest.pos.roomName}.hauler`] = { transfer: dest };
			break;
		}

		this.runCreeps(haulerAssignments);
		this.spawnHaulers();
	}

	private placeTakeOrdersForSpawns() {
		Object.values(Game.rooms).forEach((room) => {
			if (room.energyAvailable < room.energyCapacityAvailable) {
				findMySpawnsOrExtensions(room)
					.filter((t) => t.energy < t.energyCapacity)
					.forEach((t) => {
						this.take({
							dest: t.id,
							amount: t.energyCapacity - t.energy,
							priority: EnergyTransferPriority.URGENT,
						});
					});
			}
		});
	}

	private runCreeps(haulerAssignments: { [key: string]: Partial<SequenceContext>; }) {
		for (const name of Object.keys(Game.rooms).map((roomName) => `${roomName}.hauler`)) {
			for (const creep of getLiveCreeps(name)) {
				creep.room.visual.circle(creep.pos.x, creep.pos.y, { stroke: 'red', radius: 1, fill: 'transparent' });
				const sequenceContext = haulerAssignments[name] || {};
				sequenceContext.creep = creep;
				const room = Game.rooms[creep.pos.roomName];
				let source = findRoomSource(room);
				source = source instanceof Source ? undefined : source;
				sequenceContext.pickup = isPickupTarget(source) ? source : undefined;
				sequenceContext.withdraw = isWithdrawTarget(source) ? source : undefined;
				A.runSequence(webHaulCreepActions, creep, sequenceContext);
			}
		}
	}

	private spawnHaulers() {
		everyN(20, () => {
			for (const room of Object.values(Game.rooms).filter((r) => r.controller?.my)) {
				const name = `${room.name}.hauler`;
				if (getActiveCreepTtl(name) > 50 || isActiveCreepSpawning(name)) {
					continue;
				}
				const queue = SpawnQueue.getSpawnQueue();
				queue.has(name) || queue.push(buildSpawnRequest(room, name));
			}
		});
	}
}

const bodySpec = createBodySpec([
	[CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
	[CARRY, CARRY, MOVE, MOVE],
]);

function buildSpawnRequest(room: Room, name: string): SpawnRequest {
	return {
		name,
		body: getBodyForRoom(room, bodySpec),
		priority: SpawnQueuePriority.HAULER,
		time: Game.time + getActiveCreepTtl(name),
		pos: room.controller.pos,
	};
}

function initMemory(forced = false) {
	memInit(Memory, 'energyWeb', {
		put: {},
		take: {},
	}, forced);
}

initMemory();

events.listen(EventEnum.HARD_RESET, () => {
	initMemory(true);
});

export const energyWeb = new EnergyWeb();
