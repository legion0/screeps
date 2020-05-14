import * as A from "./Action";
import { isPickupTarget, isWithdrawTarget, PickupTarget, TrasferTarget, WithdrawTarget } from "./Action";
import { getActiveCreepTtl, getActiveCreep, getLiveCreeps, isActiveCreepSpawning } from "./Creep";
import { MemInit } from "./Memory";
import { findMySpawnsOrExtensions, findRoomSource, SpawnQueueItem } from "./Room";
import { SpawnQueue, SpawnQueuePriority } from "./SpawnQueue";
import { getFreeCapacity } from "./Store";
import { everyN } from "./Tick";
import { findNearbyEnergy } from "./RoomPosition";

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
	dest: Id<TrasferTarget>;
	amount: number;
	priority: EnergyTransferPriority;
}

interface SequenceContext {
	creep: Creep;
	transfer?: TrasferTarget;
	pickup?: PickupTarget;
	withdraw?: WithdrawTarget;
}

const webHaulCreepActions = [
	new A.Pickup<SequenceContext>().setArgs(c => findNearbyEnergy(c.creep.pos)),
	new A.Transfer<SequenceContext>().setArgs(c => c.transfer),
	new A.Pickup<SequenceContext>().setArgs(c => c.pickup),
	new A.Withdraw<SequenceContext>().setArgs(c => c.withdraw),
];

class EnergyWeb {
	put(request: EnergyRequest) {
		Memory.energyWeb.put[request.dest] = request;
	}

	take(request: EnergyRequest) {
		Memory.energyWeb.take[request.dest] = request;
	}

	run() {
		Object.values(Game.rooms).forEach(room => {
			if (room.energyAvailable < room.energyCapacityAvailable) {
				findMySpawnsOrExtensions(room).filter(t => t.energy < t.energyCapacity).forEach(t => {
					this.take({
						dest: t.id,
						amount: t.energyCapacity - t.energy,
						priority: EnergyTransferPriority.URGENT,
					});
				});
			}
		});

		let haulerAssignments: { [key: string]: Partial<SequenceContext> } = {};

		for (let [key, request] of Object.entries(Memory.energyWeb.take)) {
			let dest = Game.getObjectById(request.dest) as TrasferTarget;
			let freeCapacity = getFreeCapacity(dest);
			if (freeCapacity == 0) {
				delete Memory.energyWeb.take[key];
				continue;
			}

			haulerAssignments[`${dest.pos.roomName}.hauler`] = {
				transfer: dest,
			};
			break;
		}

		// run creeps
		for (let name of Object.keys(Game.rooms).map(roomName => `${roomName}.hauler`)) {
			for (let creep of getLiveCreeps(name)) {
				creep.room.visual.circle(creep.pos.x, creep.pos.y, { stroke: 'red', radius: 1, fill: 'transparent' });
				let sequenceContext = haulerAssignments[name] || {};
				sequenceContext.creep = creep;
				let room = Game.rooms[creep.pos.roomName];
				let source = findRoomSource(room);
				source = source instanceof Source ? undefined : source;
				sequenceContext.pickup = isPickupTarget(source) ? source : undefined;
				sequenceContext.withdraw = isWithdrawTarget(source) ? source : undefined;

				A.runSequence(webHaulCreepActions, creep, sequenceContext);
			}
		}

		// maintain creep fleet
		everyN(20, () => {
			for (let room of Object.values(Game.rooms).filter(room => room.controller?.my)) {
				let name = `${room.name}.hauler`;
				if (getActiveCreepTtl(name) > 50 || isActiveCreepSpawning(name)) {
					continue;
				}
				let queue = SpawnQueue.getSpawnQueue();

				console.log('getActiveCreepTtl(name)', getActiveCreepTtl(name), 'queue.has(name)', queue.has(name));

				queue.has(name) || queue.push({
					name: name,
					body: [CARRY, CARRY, MOVE, MOVE],
					priority: SpawnQueuePriority.BUILDER,
					time: Game.time + getActiveCreepTtl(name),
					pos: new RoomPosition(25, 25, room.name),
				});
			}
		});
	}
}

function webHaulerSpawnCallback(room: Room, name: string): SpawnQueueItem {
	let body: BodyPartConstant[] = [];
	// if (room.energyCapacityAvailable >= 550) {
	// body = [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE];
	// } else {
	body = [CARRY, CARRY, MOVE, MOVE];
	// }

	let cost = _.sum(body, part => BODYPART_COST[part]);
	return {
		priority: SpawnQueuePriority.HAULER,
		name: name,
		body: body,
		cost: cost,
	};
}

MemInit(Memory, 'energyWeb', {
	put: {},
	take: {},
});

export let energyWeb = new EnergyWeb();
