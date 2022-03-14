import { TransferTarget } from './Action';
import { findMaxBy, findMinBy } from './Array';
import { getHaulerCreepName, runHaulerCreep } from './creep.hauler';
import { CreepPair } from './creep_pair';
import { EventEnum, events } from './Events';
import { memInit } from './Memory';
import { findStructuresByType } from './Room';
import { BodyPartsCallback, SpawnQueue, SpawnQueuePriority, SpawnRequest } from './SpawnQueue';
import { getFreeCapacity } from './Store';
import { everyN } from './Tick';

declare global {
	interface Memory {
		energyWeb: {
			put: { [key: string]: EnergyRequest; },
			take: { [key: string]: EnergyRequest; },
		};
	}
}

export enum EnergyTransferPriority {
	NORMAL,
	URGENT,
}

interface EnergyRequest {
	dest: Id<TransferTarget>;
	amount: number;
	priority: EnergyTransferPriority;
}

interface SequenceContext {
	transferTarget?: TransferTarget;
}

class EnergyWeb {
	put(request: EnergyRequest) {
		Memory.energyWeb.put[request.dest] = request;
	}

	take(request: EnergyRequest) {
		Memory.energyWeb.take[request.dest] = request;
	}

	run() {
		const haulerAssignments: { [key: string]: Partial<SequenceContext>; } = {};
		const allRequests = Object.values(Memory.energyWeb.take)
			.map(r => ({
				dest: Game.getObjectById(r.dest),
				amount: r.amount,
				priority: r.priority,
			}))
			.filter(r => r.dest && getFreeCapacity(r.dest));
		for (const room of Object.values(Game.rooms)) {
			const creepBaseName = getHaulerCreepName(room);
			const creepPair = new CreepPair(creepBaseName);
			const creep = creepPair.getActiveCreep();
			if (creep) {
				let requests = allRequests.filter(r => r.dest.pos.roomName == room.name);
				if (requests.length) {
					const highestPriority = findMaxBy(requests, r => r.priority);
					requests = requests.filter(r => r.priority == highestPriority.priority);
					const closestTake = findMinBy(requests, r => r.dest.pos.getRangeTo(creep.pos));
					haulerAssignments[creepBaseName] = { transferTarget: closestTake.dest };
					break;
				}
			}
		}

		this.runCreeps(haulerAssignments);
	}

	private runCreeps(haulerAssignments: { [key: string]: Partial<SequenceContext>; }) {
		for (let room of Object.values(Game.rooms)) {
			if (!room.controller.my) {
				continue;
			}
			// if there is no containers to haul from then we don't need haulers.
			if (findStructuresByType(room, STRUCTURE_CONTAINER).length == 0) {
				continue;
			}
			const creepBaseName = getHaulerCreepName(room);
			const creepPair = new CreepPair(creepBaseName);
			everyN(20, () => {
				maybeRequestNextHaulerCreep(room, creepPair);
			});
			for (const creep of creepPair.getLiveCreeps()) {
				room.visual.circle(creep.pos.x, creep.pos.y, { stroke: 'red', radius: 1, fill: 'transparent' });
				runHaulerCreep(creep, haulerAssignments[creepBaseName]?.transferTarget);
			}
		}
	}
}

function maybeRequestNextHaulerCreep(room: Room, creepPair: CreepPair) {
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
		buildSpawnRequest(
			room,
			creepPair.getSecondaryCreepName(),
			Game.time + creepPair.getActiveCreepTtl()));
}

function buildSpawnRequest(room: Room, name: string, time: number): SpawnRequest {
	return {
		name,
		bodyPartsCallbackName: bodyPartsCallbackName,
		priority: SpawnQueuePriority.HAULER,
		time: time,
		pos: room.controller.pos,
		context: {
			roomName: room.name,
		}
	};
}

// TODO: add self heal better survive during attacks
function getBodyForEnergy(energy: number) {
	let amount = (energy - BODYPART_COST[MOVE] - BODYPART_COST[WORK]) / (BODYPART_COST[MOVE] + BODYPART_COST[CARRY]);
	// Round up to one if less
	amount = Math.max(amount, 1);
	// Round down if fractional
	amount = Math.floor(amount);
	const bodyParts: BodyPartConstant[] = [WORK, MOVE];
	for (let i = 0; i < amount; ++i) {
		bodyParts.push(CARRY);
	}
	for (let i = 0; i < amount; ++i) {
		bodyParts.push(MOVE);
	}
	return bodyParts;
}

function bodyPartsCallback(request: SpawnRequest, maxEnergy: number): BodyPartConstant[] {
	return getBodyForEnergy(maxEnergy);
}

const bodyPartsCallbackName = 'HaulerCreep' as Id<BodyPartsCallback>;

SpawnQueue.registerBodyPartsCallback(bodyPartsCallbackName, bodyPartsCallback);

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
