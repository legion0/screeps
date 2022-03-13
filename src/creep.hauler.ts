import { ActionType, isPickupTarget, isWithdrawTarget, moveTo, PickupTarget, TransferTarget, WithdrawTarget } from './Action';
import { build, creepActions, pickupResource, repair, transferToTarget, withdrawFromTarget } from './actions2';
import { errorCodeToString } from './constants';
import { creepIsSpawning } from './Creep';
import { CreepPair } from './creep_pair';
import { log } from './Logger';
import { findMySpawns, findRoomSource } from './Room';
import { findNearbyEnergy, lookForConstructionAt, lookForStructureAt } from './RoomPosition';
import { hasFreeCapacity, hasUsedCapacity } from './Store';
import { isDamaged } from './Structure';

export function runHaulerCreep(creep: Creep, transferTarget?: TransferTarget) {
  if (creepIsSpawning(creep)) {
    return;
  }

  if (hasFreeCapacity(creep)) {
    const nearbyEnergy = findNearbyEnergy(creep.pos);
    if (nearbyEnergy) {
      creepActions.setAction(creep, ActionType.PICKUP, (creep: Creep) => {
        return creep.pickup(nearbyEnergy);
      });
      return;
    }
  }

  if (creep.memory.highway && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0.9 * creep.store.getCapacity(RESOURCE_ENERGY)) {
    const roadConstruction = lookForConstructionAt(STRUCTURE_ROAD, creep.pos);
    if (roadConstruction) {
      // Build road
      creepActions.setAction(creep, ActionType.BUILD, (creep: Creep) => {
        return build(creep, roadConstruction);
      });
      return;
    }
    const road = lookForStructureAt(STRUCTURE_ROAD, creep.pos);
    if (road && isDamaged(road) && creep.store[RESOURCE_ENERGY]) {
      // Repair road
      creepActions.setAction(creep, ActionType.REPAIR, (creep: Creep) => {
        return repair(creep, road);
      });
      return;
    }
  }

  if (transferTarget && hasFreeCapacity(transferTarget) && hasUsedCapacity(creep)) {
    creepActions.setAction(creep, ActionType.TRANSFER, (creep: Creep) => {
      return transferToTarget(creep, transferTarget);
    });
    return;
  }

  let source = findRoomSource(creep.room);
  if (source instanceof Source) {
    if (Memory.creepSayAction) {
      creep.say('NO_SRC');
    }
    return;
  }

  if (isPickupTarget(source) && hasFreeCapacity(creep) && hasUsedCapacity(source)) {
    creepActions.setAction(creep, ActionType.PICKUP, (creep: Creep) => {
      return pickupResource(creep, source as PickupTarget);
    });
    return;
  }

  if (isWithdrawTarget(source) && hasFreeCapacity(creep) && hasUsedCapacity(source)) {
    creepActions.setAction(creep, ActionType.WITHDRAW, (creep: Creep) => {
      return withdrawFromTarget(creep, source as WithdrawTarget);
    });
    return;
  }

  const idleFlagName = `${creep.pos.roomName}.hauler.idle`;
  const idleFlag = Game.flags[idleFlagName];
  if (!idleFlag) {
    const rv = creep.room.createFlag(creep.pos, idleFlagName);
    if (typeof rv != 'string') {
      log.e(`Failed to create idle flag [${idleFlagName}] at position [${creep.pos}] with error: [${errorCodeToString(rv)}]`);
    }
  }
  if (idleFlag && !creep.pos.isEqualTo(idleFlag.pos)) {
    moveTo(creep, idleFlag.pos, /*useHighways=*/true, /*range=*/0);
    return;
  }

  if (Memory.creepSayAction) {
    creep.say('.');
  }
}

export function getHaulerCreepName(room: Room) {
  return `${room.name}.hauler`;
}

export function isHaulerCreepAlive(room: Room) {
  return new CreepPair(`${room.name}.hauler`).getLiveCreeps().length != 0;
}