import { isConcreteStructure } from './Structure';

export function getEnergyAvailableForSpawn(spawn: StructureSpawn) {
  const extensions = spawn.room.find(FIND_MY_STRUCTURES).filter(s => isConcreteStructure(s, STRUCTURE_EXTENSION)) as StructureExtension[];
  return spawn.store[RESOURCE_ENERGY] + _.sum(extensions, ext => ext.store[RESOURCE_ENERGY]);
}

export function getEnergyCapacityForSpawn(room: Room) {
  const extensions = room.find(FIND_MY_STRUCTURES).filter(s => isConcreteStructure(s, STRUCTURE_EXTENSION)) as StructureExtension[];
  return SPAWN_ENERGY_CAPACITY + _.sum(extensions, ext => EXTENSION_ENERGY_CAPACITY[room.controller.level]);
}
