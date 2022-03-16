import { ActionType, moveTo, recycle } from './Action';
import { build, creepActions, repair, upgradeController, withdrawFromTarget } from './actions2';
import { createBodySpec, getBodyForEnergyFromSpec } from './BodySpec';
import { UPGRADE_RANGE } from './constants';
import { creepIsSpawning } from './Creep';
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

  if (creep.memory.highway && creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
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
    creepActions.setAction(creep, ActionType.UPGRADE_CONTROLLER, (creep: Creep) => {
      return upgradeController(creep, room.controller);
    });
    // Reset energy source so we select a new one next round.
    if (creep.memory.energy_source) {
      delete creep.memory.energy_source;
    }
    return;
  }

  const source = findEnergySourceForUpgrade(creep);

  if (source && hasFreeCapacity(creep)) {
    creepActions.setAction(creep, ActionType.WITHDRAW, (creep: Creep) => {
      return withdrawFromTarget(creep, source);
    });
    return;
  }

  if (creep.pos.getRangeTo(room.controller.pos) < 2) {
    // Move away
    creepActions.setAction(creep, ActionType.MOVE, (creep: Creep) => {
      return moveTo(creep, room.controller.pos, /*useHighways=*/true, /*range=*/UPGRADE_RANGE);
    });
    return;
  }

  if (Memory.creepSayAction) {
    creep.say('.');
  }
}

export function getUpgradeCreepBodyForEnergy(energy: number) {
  return getBodyForEnergyFromSpec(upgradeCreepBodySpec, energy);
}

const upgradeCreepBodySpec = createBodySpec([
  /*1200*/[WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
  /*800*/[WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
  /*550*/[WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
  /*300*/[WORK, CARRY, CARRY, MOVE, MOVE],
	/*250*/[WORK, CARRY, MOVE, MOVE],
	/*200*/[WORK, CARRY, MOVE],
]);
