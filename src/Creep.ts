import { EventEnum, events } from './Events';

export function isAnyCreep(object: any): object is AnyCreep {
	return object instanceof Creep || object instanceof PowerCreep;
}

export function creepIsSpawning(creep: Creep) {
	if (!creep) {
		return false;
	}
	// On first tick when the creep is accepted by `StructureSpawn.spawnCreep`
	// `Creep.ticksToLive` is not defined and spawning isn't true either.
	return creep.spawning || creep.ticksToLive == undefined;
}

export function getCreepTtl(creep: Creep) {
	if (!creep) {
		return 0;
	}
	return creepIsSpawning(creep) ? CREEP_LIFE_TIME : creep.ticksToLive;
}

events.listen(EventEnum.EVENT_TICK_END, () => {
	if (Memory.creepSayName) {
		for (const creep of Object.values(Game.creeps)) {
			if (!creepIsSpawning(creep)) {
				creep.say(creep.name);
			}
		}
	}
});
