import { findMaxBy } from "./Array";
import * as assert from "./assert";

export interface BodySpec {
	body: BodyPartConstant[];
	cost: number;
}

export function createBodySpec(bodyOptions: BodyPartConstant[][]): BodySpec[] {
	return bodyOptions.map(body => ({
		body: body,
		cost: _.sum(body, part => BODYPART_COST[part]),
	}));
}

export function getBodyForRoom(room: Room, specs: BodySpec[]) {
	assert.ok(specs.length > 0);
	return findMaxBy(specs, spec => spec.cost <= room.energyAvailable ? spec.cost : 0)!.body;
}
