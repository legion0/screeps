import { EventEnum, events } from './Events';

export function isAnyCreep(object: any): object is AnyCreep {
	return object instanceof Creep || object instanceof PowerCreep;
}

events.listen(EventEnum.EVENT_TICK_END, () => {
	if (Memory.creepSayName) {
		for (const creep of Object.values(Game.creeps)) {
			if (!creep.spawning) {
				creep.say(creep.name);
			}
		}
	}
});
