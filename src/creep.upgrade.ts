import { ActionType, isPickupTarget, isWithdrawTarget, recycle } from './Action';
import { build, creepActions, harvest, pickupResource, repair, upgradeController, withdrawFromTarget } from './actions2';
import { creepIsSpawning } from './Creep';
import { reverseDirection } from './directions';
import { findEnergySourceForCreep } from './Room';
import { findNearbyEnergy, lookForConstructionAt, lookForStructureAt } from './RoomPosition';
import { hasFreeCapacity, hasUsedCapacity } from './Store';
import { isDamaged } from './Structure';

export function findEnergySourceForUpgrade(creep: Creep) {
  return findEnergySourceForCreep(creep, /*minLoad=*/0.1, /*switchLoad=*/0.5);
}

export function runUpgradeCreep(creep: Creep, room: Room) {
  if (creepIsSpawning(creep)) {
    return;
  }

  if (!creep.getActiveBodyparts(MOVE)) {
    creep.suicide();
    return;
  }
  if (!creep.getActiveBodyparts(WORK)) {
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

  if (hasUsedCapacity(creep)) {
    // Upgrade controller
    creepActions.setAction(creep, ActionType.REPAIR, (creep: Creep) => {
      return upgradeController(creep, room.controller);
    });
    return;
  }

  const source = findEnergySourceForUpgrade(creep);

  if (source && creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
    creepActions.setAction(creep, ActionType.WITHDRAW, (creep: Creep) => {
      return withdrawFromTarget(creep, source);
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
