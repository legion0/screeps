import { ActionType, isPickupTarget, isWithdrawTarget, PickupTarget, TransferTarget, WithdrawTarget } from './Action';
import { creepActions, idle, pickupResource, transferToTarget, withdrawFromTarget } from './actions2';
import { findMySpawns, findRoomSource } from './Room';
import { findNearbyEnergy } from './RoomPosition';
import { hasFreeCapacity, hasUsedCapacity } from './Store';

export function runHaulerCreep(creep: Creep, transferTarget?: TransferTarget) {
  if (creep.spawning) {
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

  const spawn = findMySpawns(creep.room)?.[0];
  if (spawn && !creep.pos.inRangeTo(spawn.pos, 2)) {
    creepActions.setAction(creep, ActionType.MOVE, (creep: Creep) => {
      return idle(creep);
    });
    return;
  }

  if (Memory.creepSayAction) {
    creep.say('.');
  }
}

export function getHaulerCreepName(room: Room) {
  return `${room.name}.hauler`;
}
