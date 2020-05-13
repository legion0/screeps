import * as A from "./Action";
import { MemInit } from "./Memory";
import { requestCreepSpawn, SpawnQueueItem, SpawnQueuePriority, RoomSource, RoomSync, findRoomSource, findRoomSync, findMySpawns, findMyExtensions, findMySpawnsOrExtensions } from "./Room";
import { everyN } from "./Tick";
import { WithdrawTarget, TrasferTarget, isWithdrawTarget, PickupTarget, isPickupTarget } from "./Action";
import { PriorityQueue } from "./PriorityQueue";
import { getFreeCapacity } from "./Store";

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

		let haulerAssignments: { [key: string]: SequenceContext } = {};

		if (!_.isEmpty(Memory.energyWeb.take)) {
			console.log(JSON.stringify(Memory.energyWeb.take));
		}
		for (let [key, request] of Object.entries(Memory.energyWeb.take)) {
			let dest = Game.getObjectById(request.dest) as TrasferTarget;
			let freeCapacity = getFreeCapacity(dest);
			if (freeCapacity == 0) {
				delete Memory.energyWeb.take[key];
				continue;
			}
			let room = Game.rooms[dest.pos.roomName];
			let source = findRoomSource(room);
			source = source instanceof Source ? undefined : source;

			let creep = Game.creeps['energyWeb1'];
			if (creep) {
				haulerAssignments[creep.name] = {
					creep: creep,
					pickup: isPickupTarget(source) ? source : undefined,
					withdraw: isWithdrawTarget(source) ? source : undefined,
					transfer: dest,
				};
				break;  // we only have 1 creep at the moment
			}
		}

		for (let name of ['energyWeb1'/*, 'energyWeb2'*/]) {
			let creep = Game.creeps[name];
			if (creep) {
				creep.room.visual.circle(creep.pos.x, creep.pos.y, { stroke: 'red', radius: 1, fill: 'transparent' });
				let haulerAssignment = haulerAssignments[name] || {};
				let room = Game.rooms[creep.pos.roomName];
				let source = findRoomSource(room);
				source = source instanceof Source ? undefined : source;
				haulerAssignment.pickup = isPickupTarget(source) ? source : undefined;
				haulerAssignment.withdraw = isWithdrawTarget(source) ? source : undefined;

				A.runSequence(webHaulCreepActions, Game.creeps[name], haulerAssignment);
			}
		}

		everyN(20, () => {
			for (let name of ['energyWeb1'/*, 'energyWeb2'*/]) {
				requestCreepSpawn(_.find(Game.rooms)!, name, webHaulerSpawnCallback);
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
MemInit(Memory.energyWeb, 'put', {});
MemInit(Memory.energyWeb, 'take', {});

export let energyWeb = new EnergyWeb();
