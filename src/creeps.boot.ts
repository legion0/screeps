import { ActionType } from './Action';
import { build, creepActions, harvest, repair, transferToTarget } from './actions2';
import { errorCodeToString, TERRAIN_PLAIN } from './constants';
import { getHaulerCreepName } from './creeps.hauler';
import { log } from './Logger';
import { findRoomSync } from './Room';
import { findNearbyEnergy, lookNear, posNear } from './RoomPosition';
import { hasFreeCapacity, hasUsedCapacity } from './Store';
import { isConcreteStructure, isConstructionSiteForStructure, isDamaged } from './Structure';
import { reverseDirection } from './directions';

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
  if (creep.spawning) {
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
  if (hasUsedCapacity(creep) && (roomSync instanceof StructureExtension || roomSync instanceof StructureSpawn) && !Game.creeps[getHaulerCreepName(source.room)]) {
    // Transfer to spawn/extension
    creepActions.setAction(creep, ActionType.TRANSFER, (creep: Creep) => {
      return transferToTarget(creep, roomSync);
    });
    return;
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

  if (creep.pos.getRangeTo(source.pos) < 2) {
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
