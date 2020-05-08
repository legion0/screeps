import { BUILD_RANGE, errorCodeToString, REPAIR_RANGE, UPGRADE_RANGE } from "./constants";
import { log } from "./Logger";
import { isRoomSource, isRoomSync, RoomSource, RoomSync } from "./Room";
import { hasFreeCapacity, hasUsedCapacity } from "./Store";
import { isDamaged } from "./Structure";

declare global {
	interface CreepMemory {
		lastAction?: ActionType;
	}
	interface Memory {
		creepSayAction: boolean;
	}
}

export enum ActionType {
	MOVE,
	DEPOSIT,
	REPAIR,
	BUILD,
	PICKUP,
	UPGRADE_CONTROLLER,
	WITHDRAW,
}

export function moveTo(creep: Creep, target: RoomPosition | { pos: RoomPosition }) {
	let rv: ScreepsReturnCode = OK;
	if (!creep.fatigue) {
		let targetPos = target instanceof RoomPosition ? target : target.pos;
		rv = creep.moveTo(targetPos);
		if (rv != OK) {
			log.e(`[${creep.name}] failed to moveTo [${target}] [${creep.pos}]->[${targetPos}] with error [${errorCodeToString(rv)}]`);
		}
	}
	return rv;
}

abstract class Action<ContextType> {
	readonly actionType: ActionType;
	/*readonly*/ persist: boolean = false;
	/*readonly*/ callback: (context: ContextType) => any = _.identity;

	constructor(actionType: ActionType) {
		this.actionType = actionType;
	}

	abstract test(creep: Creep, target: any): boolean;

	abstract do(creep: Creep, target: any): ScreepsReturnCode;

	getArgs(context: ContextType) {
		return this.callback(context);
	}

	// set a callback to execute on context when running sequence.
	// If multiple targets are involved this lets you pick the correct one for
	// the relevant action.
	setArgs(callback: (context: ContextType) => any) {
		this.callback = callback;
		return this;
	}

	setPersist() {
		this.persist = true;
		return this;
	}
}

export class Deposit<ContextType> extends Action<ContextType> {
	constructor() {
		super(ActionType.DEPOSIT);
	}

	test(creep: Creep, target: any) {
		return isRoomSync(target) &&
			hasFreeCapacity(target) && hasUsedCapacity(creep);
	}

	do(creep: Creep, target: RoomSync) {
		let rv: ScreepsReturnCode = OK;
		if (creep.pos.isNearTo(target)) {
			let freeCapacity = target instanceof StructureContainer ? target.store.getFreeCapacity(RESOURCE_ENERGY) : target.store.getFreeCapacity(RESOURCE_ENERGY);
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
		return target instanceof ConstructionSite && hasUsedCapacity(creep);
	}

	do(creep: Creep, target: ConstructionSite) {
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
		return target instanceof Structure && isDamaged(target) && hasUsedCapacity(creep);
	}

	do(creep: Creep, target: Structure) {
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
		return target instanceof Resource && hasFreeCapacity(creep);
	}

	do(creep: Creep, target: Resource) {
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
		return target instanceof StructureController && hasUsedCapacity(creep);
	}

	do(creep: Creep, target: StructureController) {
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
		return isRoomSource(target) && hasFreeCapacity(creep) && hasUsedCapacity(target);
	}

	do(creep: Creep, target: RoomSource) {
		let rv: ScreepsReturnCode = OK;
		if (creep.pos.isNearTo(target.pos)) {
			rv = target instanceof Source ? creep.harvest(target) : creep.withdraw(target, RESOURCE_ENERGY);
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
	if (creep.spawning) {
		return;
	}
	let chosenAction: Action<T> = null;
	let chosenTarget: any = null;
	// first try to find the persistent action we started last round and see if its still applicable
	if (creep.memory.lastAction) {
		const lastAction = creep.memory.lastAction;
		delete creep.memory.lastAction;
		for (let action of sequence) {
			if (action.persist && action.actionType == lastAction) {
				let target = action.getArgs(context);
				if (action.test(creep, target)) {
					chosenAction = action;
					chosenTarget = target;
					break;
				}
			}
		}
	}
	// next try regular actions
	if (chosenAction == null) {
		for (let action of sequence) {
			let target = action.getArgs(context);
			if (action.test(creep, target)) {
				chosenAction = action;
				chosenTarget = target;
				break;
			}
		}
	}
	// run the action
	if (chosenAction) {
		chosenAction.do(creep, chosenTarget);
		if (chosenAction.persist) {
			creep.memory.lastAction = chosenAction.actionType;
		}
		if (Memory.creepSayAction) {
			creep.say(ActionType[chosenAction.actionType]);
		}
	} else {
		creep.say('idle');
	}
}
