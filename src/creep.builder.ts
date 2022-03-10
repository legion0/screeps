import { ActionType, isPickupTarget, isWithdrawTarget, PickupTarget, recycle, WithdrawTarget } from './Action';
import { build, creepActions, harvest, pickupResource, withdrawFromTarget } from './actions2';
import { findRoomSource } from './Room';
import { findNearbyEnergy } from './RoomPosition';
import { elapsed } from './ServerCache';
import { hasFreeCapacity, hasUsedCapacity } from './Store';

export function runBuilderCreep(creep: Creep, constructionSite?: ConstructionSite) {
  if (creep.spawning) {
    return;
  }

  // Recycle
  const noMoreBuilding = elapsed(`${creep.name}.lastBuild`, /*elapsedTime=*/10, /*cacheTtl=*/50, /*resetStartTime=*/Boolean(constructionSite));
  if (noMoreBuilding || creep.getActiveBodyparts(WORK) == 0) {
    recycle(creep);
    return;
  }

  const source = findRoomSource(creep.room);

  if (hasFreeCapacity(creep)) {
    const nearbyEnergy = findNearbyEnergy(creep.pos);
    if (nearbyEnergy) {
      // Pickup nearby energy
      creepActions.setAction(creep, ActionType.PICKUP, (creep: Creep) => {
        return creep.pickup(nearbyEnergy);
      });
      return;
    }
    if (source instanceof Source && creep.pos.isNearTo(source.pos) && hasUsedCapacity(source)) {
      // Harvest source
      creepActions.setAction(creep, ActionType.HARVEST, (creep: Creep) => {
        return creep.harvest(source);
      });
      return;
    }
  }

  if (constructionSite && hasUsedCapacity(creep)) {
    // Build container
    creepActions.setAction(creep, ActionType.BUILD, (creep: Creep) => {
      return build(creep, constructionSite);
    });
    return;
  }

  // Pickup or withdraw from source
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

  if (source instanceof Source && hasFreeCapacity(creep) && hasUsedCapacity(source)) {
    // Harvest source
    creepActions.setAction(creep, ActionType.HARVEST, (creep: Creep) => {
      return harvest(creep, source);
    });
    return;
  }

  if (Memory.creepSayAction) {
    creep.say('.');
  }
}

export function getBuildCreepBodyForEnergy(energy: number) {
  if (energy >= 4 * /*100*/BODYPART_COST[WORK] + 2 * /*50*/BODYPART_COST[CARRY] + /*50*/BODYPART_COST[MOVE]) {
    return /*550*/[WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE];
  } else if (energy >= 2 * /*100*/BODYPART_COST[WORK] + /*50*/BODYPART_COST[CARRY] + /*50*/BODYPART_COST[MOVE]) {
    return /*300*/[WORK, WORK, CARRY, MOVE];
  }
  return /*200*/[WORK, CARRY, MOVE];
}
