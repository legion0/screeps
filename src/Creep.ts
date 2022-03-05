import * as assert from './assert';
import { notUndefined } from './util';

// export function hasTicksToLive(creep: Creep | undefined): creep is HasProperty<Creep, 'ticksToLive'> {
// 	return notUndefined(creep?.ticksToLive);
// }

// function getActiveCreep(baseCreepName: string): [Creep | undefined, Creep | undefined] {
// 	const main = Game.creeps[baseCreepName];
// 	const alt = Game.creeps[`${baseCreepName}_alt`];
// 	if (hasTicksToLive(alt) && hasTicksToLive(main) && alt.ticksToLive > main.ticksToLive) {
// 		return [alt, main];
// 	} else if (hasTicksToLive(alt) && hasTicksToLive(main)) {
// 		return [alt, main];
// 	}
// 	return [main, alt];
// }

// export function getCreepSpawnName(baseCreepName: string): string {
// 	const main = Game.creeps[baseCreepName];
// 	if (!main) {
// 		return baseCreepName;
// 	}
// 	assert.ok(!main.spawning);
// 	return `${baseCreepName}_alt`;
// }

// export function getLiveCreeps(baseCreepName: string): Creep[] {
// 	return getActiveCreep(baseCreepName).filter(notUndefined);
// }

// export function getLiveCreepsAll(names: string[]): Creep[] {
// 	return _.flatten(names.map(getLiveCreeps));
// }

// export function getActiveCreepTtl(baseCreepName: string): number {
// 	const main = Game.creeps[baseCreepName];
// 	const alt = Game.creeps[`${baseCreepName}_alt`];
// 	if (hasTicksToLive(main) && hasTicksToLive(alt)) {
// 		return Math.max(main.ticksToLive, alt.ticksToLive);
// 	} else if (hasTicksToLive(main)) {
// 		return main.ticksToLive;
// 	} else if (hasTicksToLive(alt)) {
// 		return alt.ticksToLive;
// 	}
// 	return 0;
// }

// export function isActiveCreepSpawning(baseCreepName: string): boolean {
// 	const main = Game.creeps[baseCreepName];
// 	const alt = Game.creeps[`${baseCreepName}_alt`];
// 	return main && main.spawning || alt && alt.spawning;
// }

export function isAnyCreep(object: any): object is AnyCreep {
	return object instanceof Creep || object instanceof PowerCreep;
}
