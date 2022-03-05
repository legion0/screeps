import { ActionType } from './Action';
import { build, creepActions, harvest, repair, transferToTarget } from './actions2';
import { Direction, errorCodeToString, TERRAIN_PLAIN } from './constants';
import { getHaulerCreepName } from './creep.Hauler';
import { log } from './Logger';
import { findRoomSync } from './Room';
import { findNearbyEnergy, lookNear, posNear } from './RoomPosition';
import { hasFreeCapacity, hasUsedCapacity } from './Store';
import { isConcreteStructure, isConstructionSiteForStructure, isDamaged } from './Structure';

function findContainer(pos: RoomPosition): StructureContainer | undefined {
  const containers = lookNear(
    pos, LOOK_STRUCTURES, (s) => isConcreteStructure(s, STRUCTURE_CONTAINER)
  ) as StructureContainer[];
  return containers[0];
}

function findConstructionSite(pos: RoomPosition) {
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
  if ((roomSync instanceof StructureExtension || roomSync instanceof StructureSpawn) && !Game.creeps[getHaulerCreepName(source.room)]) {
    // Transfer to spawn/extension
    creepActions.setAction(creep, ActionType.TRANSFER, (creep: Creep) => {
      return transferToTarget(creep, roomSync);
    });
  }

  const constructionSite = null;
  const container = findContainer(source.pos);
  if (!container) {
    const constructionSite = findConstructionSite(source.pos);
    if (!constructionSite) {
      let rv = placeContainer(source.pos);
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

  if (creep.pos.getRangeTo(source.pos) != 2) {
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

function reverseDirection(dir: Direction) {
  switch (dir) {
    case BOTTOM: return TOP;
    case TOP: return BOTTOM;
    case LEFT: return RIGHT;
    case RIGHT: return LEFT;
    case BOTTOM_LEFT: return TOP_RIGHT;
    case BOTTOM_RIGHT: return TOP_LEFT;
    case TOP_LEFT: return BOTTOM_RIGHT;
    case TOP_RIGHT: return BOTTOM_LEFT;
  }
}
