import * as assert from "./assert";
// import { Highway } from "./Highway";

import { notUndefined } from "./util";

// import { MemInit } from "./Memory";
// import { fromMemoryWorld } from "./RoomPosition";
// import { Highway } from "./Highway";
// import { moveTo } from "./Action";

// interface HighwayCreepMemory {
// 	path: RoomPosition[];
// }

// declare global {
// 	interface CreepMemory {
// 		highway: HighwayCreepMemory;
// 	}
// }

export function hasTicksToLive(creep: Creep | undefined): creep is HasProperty<Creep, 'ticksToLive'> {
	return creep != null && (creep as any).ticksToLive != null;
}

export function getActiveCreep(baseCreepName: string): [Creep | undefined, Creep | undefined] {
	let main = Game.creeps[baseCreepName];
	let alt = Game.creeps[baseCreepName + '_alt'];
	if (hasTicksToLive(alt) && hasTicksToLive(main) && alt.ticksToLive > main.ticksToLive) {
		return [alt, main];
	}
	else if (hasTicksToLive(alt) && hasTicksToLive(main)) {
		return [alt, main];
	}
	return [main, alt];
}

export function getCreepSpawnName(baseCreepName: string): string {
	let main = Game.creeps[baseCreepName];
	if (!main) {
		return baseCreepName;
	}
	assert.ok(!main.spawning);
	return baseCreepName + '_alt';
}

export function getLiveCreeps(baseCreepName: string): Creep[] {
	return getActiveCreep(baseCreepName).filter(notUndefined);
}

export function getActiveCreepTtl(baseCreepName: string): number {
	let main = Game.creeps[baseCreepName];
	let alt = Game.creeps[baseCreepName + '_alt'];
	if (hasTicksToLive(main) && hasTicksToLive(alt)) {
		return Math.max(main.ticksToLive, alt.ticksToLive);
	} else if (hasTicksToLive(main)) {
		return main.ticksToLive;
	} else if (hasTicksToLive(alt)) {
		return alt.ticksToLive;
	}
	return 0;
}

export function isActiveCreepSpawning(baseCreepName: string): boolean {
	let main = Game.creeps[baseCreepName];
	let alt = Game.creeps[baseCreepName + '_alt'];
	return (main && main.spawning) || (alt && alt.spawning);
}
