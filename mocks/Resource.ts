import { runtimeData } from "./RuntimeData";
import { RoomObject } from './Room';
import * as utils from "./utils";
import { C } from "./constants";

export class Resource extends RoomObject {
	id: Id<Resource>;

	constructor(id) {
		if (!runtimeData.roomObjects[id]) {
			throw new Error("Could not find an object with ID " + id);
		}
		let _data = runtimeData.roomObjects[id];
		super(_data.x, _data.y, _data.room, _data.effects);
		this.id = id;
	}

	getRuntimeData() {
		if (!runtimeData.roomObjects[this.id]) {
			throw new Error("Could not find an object with ID " + this.id);
		}
		return runtimeData.roomObjects[this.id];
	}

	get energy() {
		return this.getRuntimeData().energy;
	}

	get resourceType() {
		return this.getRuntimeData().resourceType ?? C.RESOURCE_ENERGY;
	}

	get amount() {
		return this.getRuntimeData()[this.resourceType];
	}

	toString() {
		return `[resource (${this.resourceType}) #${this.id}]`;
	}
}

export interface Resource extends utils.ToJsonMixin { };
utils.applyMixins(Resource, [utils.ToJsonMixin]);

export { Resource as Energy };
