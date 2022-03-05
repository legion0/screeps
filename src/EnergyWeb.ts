import { TransferTarget } from './Action';
import { createBodySpec, getBodyForRoom } from './BodySpec';
import { getActiveCreepTtl, getLiveCreeps, isActiveCreepSpawning } from './Creep';
import { getHaulerCreepName, runHaulerCreep } from './creeps.hauler';
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
			const creepName = getHaulerCreepName(room);
			everyN(20, () => {
				if (getActiveCreepTtl(creepName) > 50 || isActiveCreepSpawning(creepName)) {
					return;
				}
				const queue = SpawnQueue.getSpawnQueue();
				queue.has(creepName) || queue.push(buildSpawnRequest(room, creepName));
			});
			for (const creep of getLiveCreeps(creepName)) {
				room.visual.circle(creep.pos.x, creep.pos.y, { stroke: 'red', radius: 1, fill: 'transparent' });
				runHaulerCreep(creep, haulerAssignments[creepName]?.transferTarget);
			}
		}
	}
}

const bodySpec = createBodySpec([
	[CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
	[CARRY, CARRY, MOVE, MOVE],
]);

function buildSpawnRequest(room: Room, name: string): SpawnRequest {
	return {
		name,
		bodyPartsCallbackName: bodyPartsCallbackName,
		priority: SpawnQueuePriority.HAULER,
		time: Game.time + getActiveCreepTtl(name),
		pos: room.controller.pos,
		context: {
			roomName: room.name,
		}
	};
}

type SpawnRequestContext = {
	roomName: string;
};

function bodyPartsCallback(request: SpawnRequest): BodyPartConstant[] {
	return getBodyForRoom(Game.rooms[request.context.roomName], bodySpec);
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
