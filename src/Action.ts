import { BUILD_RANGE, errorCodeToString, REPAIR_RANGE, UPGRADE_RANGE } from "./constants";
import { log } from "./Logger";
import { hasFreeCapacity, hasUsedCapacity } from "./Store";
import { isDamaged } from "./Structure";

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
	PICKUP,
	UPGRADE_CONTROLLER,
	WITHDRAW,
}

export function moveTo(creep: Creep, target: RoomPosition | { pos: RoomPosition }) {
	creep.memory.lastAction = ActionType.MOVE;
	let rv: ScreepsReturnCode = OK;
	if (!creep.fatigue) {
		let targetPos = target instanceof RoomPosition ? target : target.pos;
		rv = creep.moveTo(targetPos);
		if (rv != OK) {
			log.e(`[${creep.name}] failed to moveTo [${target}] with error [${errorCodeToString(rv)}]`);
		}
	}
	return rv;
}

abstract class Action<ContextType> {
	protected persist: boolean;
	private actionType: ActionType;
	private callback?: (context: ContextType) => any;

	constructor(actionType: ActionType) {
		this.persist = false;
		this.actionType = actionType;
	}

	// sets the bit which fails `test` unless the action taken on the last tick is the same as this one.
	continue() {
		this.persist = true;
		return this;
	}

	protected checkPersist(creep: Creep) {
		return !this.persist || creep.memory.lastAction == this.actionType;
	}

	abstract test(creep: Creep, target: any): boolean;

	abstract do(creep: Creep, target: any): ScreepsReturnCode;

	getTarget(context: ContextType) {
		return this.callback ? this.callback(context) : context;
	}

	// set a callback to execute on context when running sequence.
	// If multiple targets are involved this lets you pick the correct one for
	// the relevant action.
	setCallback(callback: (context: ContextType) => any) {
		this.callback = callback;
		return this;
	}
}

export class Harvest<ContextType> extends Action<ContextType> {
	constructor() {
		super(ActionType.HARVEST);
	}

	test(creep: Creep, target: any) {
		return target instanceof Source && this.checkPersist(creep) && hasFreeCapacity(creep) && hasUsedCapacity(target);
	}

	do(creep: Creep, target: Source) {
		creep.memory.lastAction = ActionType.HARVEST;
		let rv: ScreepsReturnCode = OK;
		if (creep.pos.isNearTo(target.pos)) {
			let rv = creep.harvest(target);
			if (rv != OK) {
				log.e(`[${creep.name}] failed to harvest [${target}] with error [${errorCodeToString(rv)}]`);
			}
		} else {
			rv = moveTo(creep, target);
		}
		return rv;
	}
}

export class TransferEnergy<ContextType> extends Action<ContextType> {
	constructor() {
		super(ActionType.TRANSFER);
	}

	test(creep: Creep, target: any) {
		return (target instanceof StructureSpawn || target instanceof StructureContainer) && this.checkPersist(creep) && hasFreeCapacity(target) && hasUsedCapacity(creep);
	}

	do(creep: Creep, target: ObjectWithStore & (AnyCreep | Structure)) {
		creep.memory.lastAction = ActionType.TRANSFER;
		let rv: ScreepsReturnCode = OK;
		if (creep.pos.isNearTo(target)) {
			let freeCapacity = target.store.getFreeCapacity(RESOURCE_ENERGY);
			rv = creep.transfer(target, RESOURCE_ENERGY, Math.min(creep.store.energy, freeCapacity));
			if (rv != OK) {
				log.e(`[${creep.name}] failed to transfer to [${target}] with error [${errorCodeToString(rv)}]`);
			}
		} else {
			rv = moveTo(creep, target);
		}
		return rv;
	}
}

export class Build<ContextType> extends Action<ContextType> {
	constructor() {
		super(ActionType.BUILD);
	}

	test(creep: Creep, target: any) {
		return target instanceof ConstructionSite && this.checkPersist(creep) && hasUsedCapacity(creep);
	}

	do(creep: Creep, target: ConstructionSite) {
		creep.memory.lastAction = ActionType.BUILD;
		let rv: ScreepsReturnCode = OK;
		if (creep.pos.inRangeTo(target.pos, BUILD_RANGE)) {
			rv = creep.build(target);
			if (rv != OK) {
				log.e(`[${creep.name}] failed to build [${target}] with error [${errorCodeToString(rv)}]`);
			}
		} else {
			rv = moveTo(creep, target);
		}
		return rv;
	}
}

export class Repair<ContextType> extends Action<ContextType> {
	constructor() {
		super(ActionType.REPAIR);
	}

	test(creep: Creep, target: any) {
		return target instanceof Structure && this.checkPersist(creep) && isDamaged(target) && hasUsedCapacity(creep);
	}

	do(creep: Creep, target: Structure) {
		creep.memory.lastAction = ActionType.REPAIR;
		let rv: ScreepsReturnCode = OK;
		if (creep.pos.inRangeTo(target.pos, REPAIR_RANGE)) {
			rv = creep.repair(target);
			if (rv != OK) {
				log.e(`[${creep.name}] failed to repair [${target}] with error [${errorCodeToString(rv)}]`);
			}
		} else {
			rv = moveTo(creep, target);
		}
		return rv;
	}
}

export class Pickup<ContextType> extends Action<ContextType> {
	constructor() {
		super(ActionType.PICKUP);
	}

	test(creep: Creep, target: any) {
		return target instanceof Resource && this.checkPersist(creep) && hasFreeCapacity(creep);
	}

	do(creep: Creep, target: Resource) {
		creep.memory.lastAction = ActionType.PICKUP;
		let rv = creep.pickup(target);
		if (rv != OK) {
			log.e(`[${creep.name}] failed to pickup [${target}] with error [${errorCodeToString(rv)}]`);
		}
		return rv;
	}
}

export class UpgradeController<ContextType> extends Action<ContextType> {
	constructor() {
		super(ActionType.UPGRADE_CONTROLLER);
	}

	test(creep: Creep, target: any) {
		return target instanceof StructureController && this.checkPersist(creep) && hasUsedCapacity(creep);
	}

	do(creep: Creep, target: StructureController) {
		creep.memory.lastAction = ActionType.UPGRADE_CONTROLLER;
		let rv: ScreepsReturnCode = OK;
		if (creep.pos.inRangeTo(target.pos, UPGRADE_RANGE)) {
			rv = creep.upgradeController(target);
			if (rv != OK) {
				log.e(`[${creep.name}] failed to upgradeController [${target}] with error [${errorCodeToString(rv)}]`);
			}
		} else {
			rv = moveTo(creep, target);
		}
		return rv;
	}
}

export class Withdraw<ContextType> extends Action<ContextType> {
	constructor() {
		super(ActionType.WITHDRAW);
	}

	test(creep: Creep, target: any) {
		return target instanceof StructureContainer && this.checkPersist(creep) && hasFreeCapacity(creep) && hasUsedCapacity(target);
	}

	do(creep: Creep, target: StructureContainer) {
		creep.memory.lastAction = ActionType.WITHDRAW;
		let rv: ScreepsReturnCode = OK;
		if (creep.pos.isNearTo(target.pos)) {
			rv = creep.withdraw(target, RESOURCE_ENERGY);
			if (rv != OK) {
				log.e(`[${creep.name}] failed to withdraw from [${target}] with error [${errorCodeToString(rv)}]`);
			}
		} else {
			rv = moveTo(creep, target);
		}
		return rv;
	}
}

export function runSequence<T>(sequence: Action<T>[], creep: Creep, context: any) {
	for (let action of sequence) {
		let target = action.getTarget(context);
		if (action.test(creep, target)) {
			action.do(creep, target);
			// creep.say(ActionType[creep.memory.lastAction]);
			return;
		}
	}
	creep.say('idle');
}
