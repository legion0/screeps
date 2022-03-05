import { EnergyTransferPriority, energyWeb } from './EnergyWeb';
import { EventEnum, events } from './Events';
import { findMySpawnsOrExtensions } from './Room';
import { isConcreteStructure } from './Structure';

events.listen(EventEnum.EVENT_TICK_START, () => {
  Object.values(Game.rooms).forEach((room) => {
    if (room.energyAvailable < room.energyCapacityAvailable) {
      findMySpawnsOrExtensions(room)
        .filter((t) => t.energy < t.energyCapacity)
        .forEach((t) => {
          energyWeb.take({
            dest: t.id,
            amount: t.energyCapacity - t.energy,
            priority: EnergyTransferPriority.URGENT,
          });
        });
    }
  });
});

export function getEnergyAvailableForSpawn(spawn: StructureSpawn) {
  const extensions = spawn.room.find(FIND_MY_STRUCTURES).filter(s => isConcreteStructure(s, STRUCTURE_EXTENSION)) as StructureExtension[];
  return spawn.store[RESOURCE_ENERGY] + _.sum(extensions, ext => ext.store[RESOURCE_ENERGY]);
}
