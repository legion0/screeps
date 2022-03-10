import { ActionType, isPickupTarget, isWithdrawTarget, recycle } from './Action';
import { build, creepActions, harvest, pickupResource, repair, upgradeController, withdrawFromTarget } from './actions2';
import { reverseDirection } from './directions';
import { findRoomSource } from './Room';
import { findNearbyEnergy, lookForConstructionAt, lookForStructureAt } from './RoomPosition';
import { hasFreeCapacity, hasUsedCapacity } from './Store';
import { isDamaged } from './Structure';



export function runUpgradeCreep(creep: Creep, room: Room) {
  if (creep.spawning) {
    return;
  }

  if (!creep.getActiveBodyparts(WORK)) {
    if (creep.getActiveBodyparts(MOVE)) {
      recycle(creep);
    } else {
      creep.suicide();
    }
    return;
  }

  const source = findRoomSource(room);
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

  if (isPickupTarget(source) && hasFreeCapacity(creep) && hasUsedCapacity(source)) {
    creepActions.setAction(creep, ActionType.PICKUP, (creep: Creep) => {
      return pickupResource(creep, source);
    });
    return;
  }

  if (isWithdrawTarget(source) && hasFreeCapacity(creep) && hasUsedCapacity(source)) {
    creepActions.setAction(creep, ActionType.PICKUP, (creep: Creep) => {
      return withdrawFromTarget(creep, source);
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
