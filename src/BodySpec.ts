import { findMaxBy } from './Array';
import * as assert from './assert';
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
	return getBodyForEnergyFromSpec(specs, getEnergyCapacityForSpawn(room));
}

export function getBodyForSpawn(spawn: StructureSpawn, specs: BodySpec[]) {
	return getBodyForEnergyFromSpec(specs, getEnergyAvailableForSpawn(spawn));
}

export function getBodyForEnergyFromSpec(specs: BodySpec[], energy: number) {
	assert.ok(specs.length > 0);
	return findMaxBy(specs, spec => (spec.cost <= energy ? spec.cost : 0))!.body;
}
