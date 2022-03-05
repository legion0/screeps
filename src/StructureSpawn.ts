import { EnergyTransferPriority, energyWeb } from './EnergyWeb';
import { EventEnum, events } from './Events';
import { findMySpawnsOrExtensions } from './Room';

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
