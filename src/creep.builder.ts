import { ActionType, isPickupTarget, isWithdrawTarget, PickupTarget, recycle, WithdrawTarget } from './Action';
import { build, creepActions, harvest, pickupResource, withdrawFromTarget } from './actions2';
import { reverseDirection } from './directions';
import { findEnergySourceForCreep, findRoomSource } from './Room';
import { findNearbyEnergy } from './RoomPosition';
import { elapsed } from './ServerCache';
import { hasFreeCapacity, hasUsedCapacity } from './Store';

export function findEnergySourceForBuilder(creep: Creep) {
  return findEnergySourceForCreep(creep, /*minLoad=*/0.2, /*switchLoad=*/0.3);
}

export function runBuilderCreep(creep: Creep, constructionSite?: ConstructionSite) {
  if (creep.spawning) {
    return;
  }

  if (!creep.getActiveBodyparts(MOVE)) {
    creep.suicide();
    return;
  }
  const noMoreBuilding = elapsed(`${creep.name}.lastBuild`, /*elapsedTime=*/10, /*cacheTtl=*/50, /*resetStartTime=*/Boolean(constructionSite));
  if (noMoreBuilding || creep.getActiveBodyparts(WORK) == 0) {
    recycle(creep);
    return;
  }

  if (hasFreeCapacity(creep)) {
    const nearbyEnergy = findNearbyEnergy(creep.pos);
    if (nearbyEnergy) {
      // Pickup nearby energy
      creepActions.setAction(creep, ActionType.PICKUP, (creep: Creep) => {
        return creep.pickup(nearbyEnergy);
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

  const source = findEnergySourceForBuilder(creep);
  if (source && creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
    creepActions.setAction(creep, ActionType.WITHDRAW, (creep: Creep) => {
      return withdrawFromTarget(creep, source as WithdrawTarget);
    });
    return;
  }

  if (source && creep.pos.getRangeTo(source.pos) < 2) {
    // Move away
    creepActions.setAction(creep, ActionType.MOVE, (creep: Creep) => {
      return creep.move(reverseDirection(creep.pos.getDirectionTo(source.pos)));;
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
