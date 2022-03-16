import { ActionType, isPickupTarget, isWithdrawTarget, moveTo, recycle, TransferTarget } from './Action';
import { build, creepActions, pickupResource, repair, transferToTarget, withdrawFromTarget } from './actions2';
import { findMaxBy, findMinBy } from './Array';
import { errorCodeToString } from './constants';
import { creepIsSpawning } from './Creep';
import { CreepPair } from './creep_pair';
import { log } from './Logger';
import { findRecycledEnergy, findStructuresByType } from './Room';
import { findNearbyEnergy, lookForConstructionAt, lookForStructureAt } from './RoomPosition';
import { findStorageContainerPosition } from './room_layout';
import { getCapacityLoad, getUsedCapacity, hasFreeCapacity, hasUsedCapacity } from './Store';
import { isDamaged } from './Structure';

export function runHaulerCreep(creep: Creep, transferTarget?: TransferTarget) {
  if (creepIsSpawning(creep)) {
    return;
  }

  if (!creep.getActiveBodyparts(MOVE)) {
    creep.suicide();
    return;
  }

  if (!creep.getActiveBodyparts(CARRY) || !creep.getActiveBodyparts(WORK)) {
    recycle(creep);
    return;
  }

  // Pickup nearby energy
  if (hasFreeCapacity(creep)) {
    const nearbyEnergy = findNearbyEnergy(creep.pos);
    if (nearbyEnergy) {
      creepActions.setAction(creep, ActionType.PICKUP, (creep: Creep) => {
        return creep.pickup(nearbyEnergy);
      });
      return;
    }
  }

  // Build/Repair road at creep position
  if (creep.memory.highway && getCapacityLoad(creep) > 0.9) {
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
    // Transfer resources to target
    if (transferTarget && hasFreeCapacity(transferTarget)) {
      creepActions.setAction(creep, ActionType.TRANSFER, (creep: Creep) => {
        return transferToTarget(creep, transferTarget);
      });
      return;
    }

    // Transfer resources to storage container
    const storageContainer = findStorageContainer(creep.room);
    if (storageContainer && hasFreeCapacity(storageContainer)) {
      creepActions.setAction(creep, ActionType.TRANSFER, (creep: Creep) => {
        return transferToTarget(creep, storageContainer);
      });
      return;
    }

    // Repair storage container
    if (storageContainer && storageContainer.hits < storageContainer.hitsMax) {
      creepActions.setAction(creep, ActionType.REPAIR, (creep: Creep) => {
        return repair(creep, storageContainer);
      });
      return;
    }
  }

  if (hasFreeCapacity(creep)) {
    // Pickup recycled resources
    const energy = findRecycledEnergy(creep.room);
    if (energy && energy instanceof Tombstone) {
      creepActions.setAction(creep, ActionType.WITHDRAW, (creep: Creep) => {
        return withdrawFromTarget(creep, energy);
      });
      return;
    } else if (energy) {
      creepActions.setAction(creep, ActionType.PICKUP, (creep: Creep) => {
        return pickupResource(creep, energy as Resource<RESOURCE_ENERGY>);
      });
      return;
    }

    const storageContainer = findStorageContainer(creep.room);
    if (storageContainer && transferTarget && hasUsedCapacity(storageContainer) && storageContainer.id != transferTarget.id) {
      // Pickup from storage container
      creepActions.setAction(creep, ActionType.WITHDRAW, (creep: Creep) => {
        return withdrawFromTarget(creep, storageContainer);
      });
      return;
    }

    // Pickup distant source
    const source = findDistantSource(creep.room, creep.pos);
    if (source) {
      if (isPickupTarget(source)) {
        creepActions.setAction(creep, ActionType.PICKUP, (creep: Creep) => {
          return pickupResource(creep, source);
        });
        return;
      }

      if (isWithdrawTarget(source)) {
        creepActions.setAction(creep, ActionType.WITHDRAW, (creep: Creep) => {
          return withdrawFromTarget(creep, source);
        });
        return;
      }
    }
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

function findDistantSource(room: Room, haulerPos: RoomPosition) {
  const resources = room.find(FIND_DROPPED_RESOURCES).filter(r => r.resourceType == RESOURCE_ENERGY);
  if (resources.length) {
    return findMinBy(resources, r => r.pos.getRangeTo(haulerPos));
  }
  const tombStones = room.find(FIND_TOMBSTONES).filter(r => hasUsedCapacity(r));
  if (tombStones.length) {
    return findMinBy(tombStones, r => r.pos.getRangeTo(haulerPos));
  }
  const storageContainer = findStorageContainer(room);
  let containers = findStructuresByType(room, STRUCTURE_CONTAINER).filter(s => hasUsedCapacity(s));
  if (storageContainer) {
    containers = containers.filter(s => !s.pos.isEqualTo(storageContainer.pos));
  }
  return containers.length ? findMaxBy(containers, getUsedCapacity) : null;
}

function findStorageContainer(room: Room) {
  const pos = findStorageContainerPosition(room);
  if (pos) {
    const container = lookForStructureAt(STRUCTURE_CONTAINER, pos);
    if (container) {
      return container;
    }
  }
  return null;
}

export function getHaulerCreepName(room: Room) {
  return `${room.name}.hauler`;
}

export function isHaulerCreepAlive(room: Room) {
  return new CreepPair(`${room.name}.hauler`).getLiveCreeps().length != 0;
}
