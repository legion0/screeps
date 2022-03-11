import { TERRAIN_PLAIN, TERRAIN_SWAMP } from './constants';
import { findMyConstructionSites, findMyExtensions, findMySpawns } from './Room';
import { fromMemoryRoom, lookForConstructionAt, lookForStructureAt, posDiag, RoomPositionMemory, toMemoryRoom } from './RoomPosition';
import { isConstructionSiteForStructure } from './Structure';

declare global {
  interface RoomMemory {
    storage_container_pos?: RoomPositionMemory;
  }
}

function canBuildAt(room: Room, pos: RoomPosition): boolean {
  return room.lookForAt(LOOK_STRUCTURES, pos).length === 0 && room.lookForAt(LOOK_CONSTRUCTION_SITES, pos).length === 0;
}

function isWalkableTerrainAt(room: Room, pos: RoomPosition) {
  const [terrain] = room.lookForAt(LOOK_TERRAIN, pos);
  return terrain === TERRAIN_PLAIN || terrain === TERRAIN_SWAMP;
}

// Returns a generator that spreads diagonally in BFS order from the given `pos`
function* spread(pos: RoomPosition): Generator<RoomPosition> {
  const queue: RoomPosition[] = [];
  const visited: Set<number> = new Set();
  let current = pos;
  queue.push(current);
  visited.add(toMemoryRoom(current));

  while (queue.length) {
    current = queue.shift()!;
    yield current;
    for (const other of posDiag(current)) {
      if (!visited.has(toMemoryRoom(other))) {
        visited.add(toMemoryRoom(other));
        queue.push(other);
      }
    }
  }
}

export function* nextAvailableBuildingLocation(room: Room, center: RoomPosition) {
  for (const pos of spread(center)) {
    if (isWalkableTerrainAt(room, pos) && canBuildAt(room, pos)) {
      yield pos;
    }
  }
}

export function* nextExtensionPos(room: Room) {
  const maxExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level];
  if (maxExtensions === 0) {
    return;
  }
  let currentExtensions = findMyExtensions(room).length +
    findMyConstructionSites(room).filter((s) => isConstructionSiteForStructure(s, STRUCTURE_EXTENSION)).length;
  if (currentExtensions >= maxExtensions) {
    return;
  }
  // TODO: support multiple spawns
  const spawnPos = findMySpawns(room)?.[0]?.pos;
  if (spawnPos) {
    for (const pos of nextAvailableBuildingLocation(room, spawnPos)) {
      yield pos;
      currentExtensions += 1;
      if (currentExtensions >= maxExtensions) {
        return;
      }
    }
  }
}

function findNewStorageContainerPosition(room: Room) {
  // TODO: support multiple spawns
  const spawnPos = findMySpawns(room)?.[0]?.pos;
  if (spawnPos) {
    for (const pos of nextAvailableBuildingLocation(room, spawnPos)) {
      return pos;
    }
  }
  return null;
}

function findExistingStorageContainerPosition(room: Room) {
  // TODO: support multiple spawns
  const spawnPos = findMySpawns(room)?.[0]?.pos;
  const maxEmptySpacesInSearch = 5;
  let emptySpaces = 0;
  if (spawnPos) {
    for (const pos of spread(spawnPos)) {
      if (lookForStructureAt(STRUCTURE_CONTAINER, pos) || lookForConstructionAt(STRUCTURE_CONTAINER, pos)) {
        return pos;
      }
      if (isWalkableTerrainAt(room, pos) && canBuildAt(room, pos)) {
        if (++emptySpaces > maxEmptySpacesInSearch) {
          break;
        }
      }
    }
  }
  return null;
}

export function findStorageContainerPosition(room: Room) {
  if (room.memory.storage_container_pos) {
    const pos = fromMemoryRoom(room.memory.storage_container_pos, room.name);
    const container = lookForStructureAt(STRUCTURE_CONTAINER, pos) ?? lookForConstructionAt(STRUCTURE_CONTAINER, pos);
    if (container) {
      return pos;
    } else {
      delete room.memory.storage_container_pos;
      return findStorageContainerPosition(room);
    }
  }

  const pos = findExistingStorageContainerPosition(room) || findNewStorageContainerPosition(room);
  if (pos) {
    room.memory.storage_container_pos = toMemoryRoom(pos);
    return pos;
  }
  return null;
}
