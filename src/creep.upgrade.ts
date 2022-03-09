import { ActionType, isPickupTarget, isWithdrawTarget, recycle } from './Action';
import { build, creepActions, harvest, pickupResource, repair, upgradeController, withdrawFromTarget } from './actions2';
import { errorCodeToString, TERRAIN_PLAIN } from './constants';
import { log } from './Logger';
import { findRoomSource } from './Room';
import { findNearbyEnergy, lookForConstructionAt, lookForStructureAt, lookNear, posNear } from './RoomPosition';
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

  const roadConstruction = lookForConstructionAt(STRUCTURE_ROAD, creep.pos);
  if (roadConstruction && creep.store[RESOURCE_ENERGY] && creep.memory.highway) {
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
