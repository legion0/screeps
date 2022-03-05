import * as assert from './assert';

import { findMaxBy } from './Array';
import { getEnergyAvailableForSpawn, getEnergyCapacityForSpawn } from './structure.spawn.energy';

export interface BodySpec {
	body: BodyPartConstant[];
	cost: number;
}

export function createBodySpec(bodyOptions: BodyPartConstant[][]): BodySpec[] {
	assert.ok(bodyOptions.length > 0);
	return bodyOptions.map((body) => ({
		body,
		cost: _.sum(body, (part) => BODYPART_COST[part]),
	}));
}

export function getBodyForRoom(room: Room, specs: BodySpec[]) {
	assert.ok(specs.length > 0);
	return findMaxBy(specs, (spec) => (spec.cost <= getEnergyCapacityForSpawn(room) ? spec.cost : 0))!.body;
}

export function getBodyForSpawn(spawn: StructureSpawn, specs: BodySpec[]) {
	assert.ok(specs.length > 0);
	return findMaxBy(specs, spec => (spec.cost <= getEnergyAvailableForSpawn(spawn) ? spec.cost : 0))!.body;
}
