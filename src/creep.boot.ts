import { ActionType, moveTo, recycle } from './Action';
import { build, creepActions, harvest, pickupResource, repair, transferToTarget, withdrawFromTarget } from './actions2';
import { errorCodeToString, TERRAIN_PLAIN } from './constants';
import { creepIsSpawning } from './Creep';
import { isHaulerCreepAlive } from './creep.hauler';
import { log } from './Logger';
import { findRecycledEnergy, findRoomSync } from './Room';
import { findNearbyEnergy, lookForStructureAt, lookNear, posNear } from './RoomPosition';
import { findStorageContainerPosition } from './room_layout';
import { hasFreeCapacity, hasUsedCapacity } from './Store';
import { isConcreteStructure, isConstructionSiteForStructure, isDamaged } from './Structure';

function findContainer(pos: RoomPosition): StructureContainer | null {
  const containers = lookNear(
    pos, LOOK_STRUCTURES, (s) => isConcreteStructure(s, STRUCTURE_CONTAINER)
  ) as StructureContainer[];
  return containers[0] ?? null;
}

function findConstructionSite(pos: RoomPosition): ConstructionSite<STRUCTURE_CONTAINER> | null {
  const constructionSites = lookNear(
    pos, LOOK_CONSTRUCTION_SITES, (s) => isConstructionSiteForStructure(s, STRUCTURE_CONTAINER)
  );
  return (constructionSites[0]) as ConstructionSite<STRUCTURE_CONTAINER>;
}

function isPosGoodForContainer(pos: RoomPosition) {
  return pos.lookFor(LOOK_CONSTRUCTION_SITES).length === 0 &&
    pos.lookFor(LOOK_TERRAIN)[0] === TERRAIN_PLAIN &&
    pos.lookFor(LOOK_STRUCTURES).length === 0;
}

function placeContainer(sourcePosition: RoomPosition) {
  const containerPos = posNear(sourcePosition, /* includeSelf=*/false).find(isPosGoodForContainer);
  const rv = containerPos ? containerPos.createConstructionSite(STRUCTURE_CONTAINER) : ERR_NOT_FOUND;
  if (rv !== OK) {
    log.e(`Failed to create STRUCTURE_CONTAINER at [${containerPos}] with error [${errorCodeToString(rv)}]`);
  }
  return rv;
}

export function runBootCreep(creep: Creep, source: Source) {
  if (creepIsSpawning(creep)) {
    return;
  }

  // Recycle
  if (creep.getActiveBodyparts(WORK) == 0) {
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
    if (creep.pos.isNearTo(source.pos) && hasUsedCapacity(source)) {
      // Harvest source
      creepActions.setAction(creep, ActionType.HARVEST, (creep: Creep) => {
        return creep.harvest(source);
      });
      return;
    }
  }

  const roomSync = findRoomSync(source.room);
  if ((roomSync instanceof StructureExtension || roomSync instanceof StructureSpawn) && !isHaulerCreepAlive(source.room)) {

  }
  if (hasUsedCapacity(creep)) {
    // Transfer to spawn/extension
    creepActions.setAction(creep, ActionType.TRANSFER, (creep: Creep) => {
      return transferToTarget(creep, roomSync);
    });
    return;
  } else {
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
    if (storageContainer && hasUsedCapacity(storageContainer)) {
      // Pickup from storage container
      creepActions.setAction(creep, ActionType.WITHDRAW, (creep: Creep) => {
        return withdrawFromTarget(creep, storageContainer);
      });
      return;
    }
  }


  const container = findContainer(source.pos);
  let constructionSite = null;
  if (!container) {
    constructionSite = findConstructionSite(source.pos);
    if (!constructionSite) {
      const rv = placeContainer(source.pos);
      if (rv != OK) {
        log.e(`[${creep.name}] at pos [${creep.pos}] failed to place container construction site with error [${errorCodeToString(rv)}]`);
      }
    }
  }

  if (container
    && container.store.getUsedCapacity(RESOURCE_ENERGY) == 0
    && container.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
    // Transfer to container if its totally empty
    creepActions.setAction(creep, ActionType.TRANSFER, (creep: Creep) => {
      return transferToTarget(creep, container);
    });
    return;
  }

  if (constructionSite && hasUsedCapacity(creep)) {
    // Build container
    creepActions.setAction(creep, ActionType.BUILD, (creep: Creep) => {
      return build(creep, constructionSite);
    });
    return;
  }

  if (container && isDamaged(container) && hasUsedCapacity(creep)) {
    // Repair container
    creepActions.setAction(creep, ActionType.REPAIR, (creep: Creep) => {
      return repair(creep, container);
    });
    return;
  }

  if (container && hasFreeCapacity(container) && hasUsedCapacity(creep)) {
    // Transfer to container
    creepActions.setAction(creep, ActionType.TRANSFER, (creep: Creep) => {
      return transferToTarget(creep, container);
    });
    return;
  }

  if (hasFreeCapacity(creep) && hasUsedCapacity(source)) {
    // Harvest source
    creepActions.setAction(creep, ActionType.HARVEST, (creep: Creep) => {
      return harvest(creep, source);
    });
    return;
  }

  if (!creep.pos.isEqualTo(source.pos)) {
    // idle
    creepActions.setAction(creep, ActionType.MOVE, (creep: Creep) => {
      return moveTo(creep, source.pos, /*useHighways=*/false, /*range=*/0);
    });
    return;
  }

  if (Memory.creepSayAction) {
    creep.say('.');
  }
}

export function getBootCreepBodyForEnergy(energy: number) {
  if (energy >= 4 * /*100*/BODYPART_COST[WORK] + 2 * /*50*/BODYPART_COST[CARRY] + /*50*/BODYPART_COST[MOVE]) {
    return /*550*/[WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE];
  } else if (energy >= 2 * /*100*/BODYPART_COST[WORK] + /*50*/BODYPART_COST[CARRY] + /*50*/BODYPART_COST[MOVE]) {
    return /*300*/[WORK, WORK, CARRY, MOVE];
  }
  return /*200*/[WORK, CARRY, MOVE];
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
