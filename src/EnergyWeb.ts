import { TransferTarget } from './Action';
import { getHaulerCreepName, runHaulerCreep } from './creeps.hauler';
import { CreepPair } from './creep_pair';
import { EventEnum, events } from './Events';
import { memInit } from './Memory';
import { findStructuresByType } from './Room';
import { BodyPartsCallback, SpawnQueue, SpawnQueuePriority, SpawnRequest } from './SpawnQueue';
import { getFreeCapacity } from './Store';
import { getEnergyAvailableForSpawn, getEnergyCapacityForSpawn } from './structure.spawn.energy';
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

			haulerAssignments[getHaulerCreepName(Game.rooms[dest.pos.roomName])] = { transferTarget: dest };
			break;
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
				if (creepPair.getActiveCreepTtl() > 50) {
					return;
				}
				SpawnQueue.getSpawnQueue().has(creepPair.getSecondaryCreepName())
					|| creepPair.getSecondaryCreep()?.spawning
					|| SpawnQueue.getSpawnQueue().push(
						buildSpawnRequest(room, creepPair.getSecondaryCreepName(),
							Game.time + creepPair.getActiveCreepTtl()));
			});
			for (const creep of creepPair.getLiveCreeps()) {
				room.visual.circle(creep.pos.x, creep.pos.y, { stroke: 'red', radius: 1, fill: 'transparent' });
				runHaulerCreep(creep, haulerAssignments[creepBaseName]?.transferTarget);
			}
		}
	}
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
	let amount = energy / (BODYPART_COST[MOVE] + BODYPART_COST[CARRY]);
	// Round up to one if less
	amount = Math.max(amount, 1);
	// Round down if fractional
	amount = Math.floor(amount);
	const bodyParts = [];
	for (let i = 0; i < amount; ++i) {
		bodyParts.push(CARRY);
	}
	for (let i = 0; i < amount; ++i) {
		bodyParts.push(MOVE);
	}
	return bodyParts;
}

function bodyPartsCallback(request: SpawnRequest, spawn?: StructureSpawn): BodyPartConstant[] {
	const room = Game.rooms[request.context.roomName];
	// return getBodyForRoom(Game.rooms[request.context.roomName], bodySpec);
	if (spawn) {
		return getBodyForEnergy(getEnergyAvailableForSpawn(spawn));
	} else {
		return getBodyForEnergy(getEnergyCapacityForSpawn(room));
	}
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
