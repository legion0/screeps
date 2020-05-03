import { log } from "./Logger";
import { errorCodeToString, REPAIR_RANGE, BUILD_RANGE } from "./constants";
import { lstat } from "fs";

declare global {
	interface CreepMemory {
		lastAction?: ActionType;
	}
}

export enum ActionType {
	MOVE,
	TRANSFER,
	REPAIR,
	BUILD,
	HARVEST,
}

export function moveTo(creep: Creep, target: RoomPosition | { pos: RoomPosition }) {
	creep.memory.lastAction = ActionType.MOVE;
	let rv: ScreepsReturnCode = OK;
	if (!creep.fatigue) {
		let targetPos = target instanceof RoomPosition ? target : target.pos;
		rv = creep.moveTo(targetPos);
		if (rv != OK) {
			log.e(`Failed to move creep [${creep.name}] to [${target}] with error [${errorCodeToString(rv)}]`);
		}
	}
	return rv;
}

export function transferEnergy(creep: Creep, target: Structure & { store: GenericStoreBase }) {
	creep.memory.lastAction = ActionType.TRANSFER;
	let rv: ScreepsReturnCode = OK;
	if (creep.pos.isNearTo(target)) {
		let freeCapacity = target.store.getFreeCapacity(RESOURCE_ENERGY);
		rv = creep.transfer(target, RESOURCE_ENERGY, Math.min(creep.store.energy, freeCapacity));
		if (rv != OK) {
			log.e(`Failed to transfer resource from creep [${creep.name}] to target StructureSpawn [${target.pos}] with error [${errorCodeToString(rv)}]`);
		}
	} else {
		rv = moveTo(creep, target);
	}
	return rv;
}

export function repair(creep: Creep, target: Structure) {
	creep.memory.lastAction = ActionType.REPAIR;
	let rv: ScreepsReturnCode = OK;
	if (creep.pos.inRangeTo(target.pos, REPAIR_RANGE)) {
		rv = creep.repair(target);
		if (rv != OK) {
			log.e(`Failed to repair from creep [${creep.name}] to target StructureContainer [${target.pos}] with error [${errorCodeToString(rv)}]`);
		}
	} else {
		rv = moveTo(creep, target);
	}
	return rv;
}

export function build(creep: Creep, target: ConstructionSite) {
	creep.memory.lastAction = ActionType.BUILD;
	let rv: ScreepsReturnCode = OK;
	if (creep.pos.inRangeTo(target.pos, BUILD_RANGE)) {
		rv = creep.build(target);
		if (rv != OK) {
			log.e(`Failed to build for creep [${creep.name}] at [${target.structureType}][${target.pos}] with error [${errorCodeToString(rv)}]`);
		}
	} else {
		rv = moveTo(creep, target);
	}
	return rv;
}

export function harvest(creep: Creep, target: Source) {
	creep.memory.lastAction = ActionType.HARVEST;
	let rv: ScreepsReturnCode = OK;
	if (creep.pos.isNearTo(target.pos)) {
		let rv = creep.harvest(target);
		if (rv != OK) {
			log.e(`Failed to harvest source [${target.pos}] from creep [${creep.name}] with error [${errorCodeToString(rv)}]`);
		}
	} else {
		rv = moveTo(creep, target);
	}
	return rv;
}

export function isLast(creep: Creep, actionType: ActionType) {
	return creep.memory.lastAction == actionType;
}