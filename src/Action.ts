import { BUILD_RANGE, errorCodeToString, REPAIR_RANGE, UPGRADE_RANGE } from "./constants";
import { Highway } from "./Highway";
import { log } from "./Logger";
import { MemInit } from "./Memory";
import { isRoomSource, isRoomSync, RoomSource, RoomSync } from "./Room";
import { fromMemory, RoomPositionMemory, toMemory } from "./RoomPosition";
import { hasFreeCapacity, hasUsedCapacity } from "./Store";
import { isDamaged } from "./Structure";

declare global {
	interface CreepMemory {
		lastAction?: ActionType;
		highway?: {
			path?: RoomPositionMemory[];
			from: RoomPositionMemory;
		};
		lastPos?: {
			pos: RoomPositionMemory;
			since: number;
		};
	}
	interface Memory {
		creepSayAction: boolean;
		highwaydebugVisuals: boolean;
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

function creepIsStuck(creep: Creep) {
	let lastPos = MemInit(creep.memory, 'lastPos', {});
	if (!creep.pos.isEqualTo(fromMemory(lastPos.pos))) {
		lastPos.pos = toMemory(creep.pos);
		lastPos.since = Game.time;
		return false;
	}
	return lastPos.since + 3 < Game.time;
}

function walkHighway(creep: Creep, to: RoomPosition) {
	MemInit(creep.memory, 'highway', { path: [] });

	let fakeCurrent = creep.pos;

	// highway usage ends at range 4 and we shift to regular walking, time to remeber where we were headed from for next highway walk
	if (creep.pos.getRangeTo(to) <= 4) {
		creep.memory.highway.from = toMemory(to);
		return OK;
	}

	// if we have a source lets walk the highway from there to our destination
	if (creep.memory.highway.from && creep.pos.getRangeTo(to) > 4) {
		let from = fromMemory(creep.memory.highway.from);
		if (from.isEqualTo(to)) {
			return ERR_FULL;
		}
		let path = creep.memory.highway.path.map(fromMemory);
		if (path.length && path[0].isEqualTo(creep.pos)) {
			path.shift();
			creep.memory.highway.path.shift();
		}
		// if (creep.name == 'UpgradeController.W8N3.0') {
		// 	console.log(creep, creep.pos, to, undefined, path);
		// }
		// if (creep.name == 'UpgradeController.W8N3.1') {
		// 	log.d(creep.memory.lastPos);
		// }
		if (path.length && creepIsStuck(creep)) {
			log.w(`Creep [${creep}] stuck, moving to next highway position`);
			fakeCurrent = path.shift();
			creep.memory.highway.path.shift();
		}
		if (!path.length && from.getRangeTo(to) >= 10) {
			// log.d(`Creep [${creep}] at [${creep.pos}] is creating a highway from [${from}] to [${to}]`);
			if (Memory.highwaydebugVisuals) {
				creep.room.visual.line(from.x, from.y, to.x, to.y, { color: 'blue' });
				creep.room.visual.line(from.x, from.y, creep.pos.x, creep.pos.y, { color: 'blue' });
				creep.room.visual.line(creep.pos.x, creep.pos.y, to.x, to.y, { color: 'blue' });
			}
			let highway = new Highway(from, to).build();
			if (highway instanceof Highway) {
				highway.buildRoad();
				path = highway.nextSegment(fakeCurrent, to);
				creep.memory.highway.path = path.map(toMemory);
				// log.d('NEW PATH !!! ', creep, path);
			} else {
				log.e(`[${creep.name}] failed to build highway [${from}]->[${to}] with error [${errorCodeToString(highway)}]`);
			}
		}
		if (!path.length) {
			return ERR_NO_PATH;
		}
		if (Memory.highwaydebugVisuals) {
			creep.room.visual.poly(path, { stroke: 'red' });
		}
		return path[0];
	}
	return OK;
}

export function moveTo(creep: Creep, to: RoomPosition, highway: boolean) {
	let rv: ScreepsReturnCode = OK;
	if (highway) {
		let highwayNextPos = walkHighway(creep, to);
		if (highwayNextPos instanceof RoomPosition) {
			// log.d(`Creep [${creep}] using highway`);
			to = highwayNextPos;
			// log.d(`Creep [${creep}] using highway with next pos [${to}]`);
		} else if (highwayNextPos != OK) {
			log.e(`Creep [${creep}] at [${creep.pos}] failed to walk highway from [${creep.memory.highway?.from}] to [${to}] with error [${errorCodeToString(highwayNextPos)}]`);
		}
	}
	if (!creep.fatigue) {
		if (creep.pos.isNearTo(to)) {
			rv = creep.move(creep.pos.getDirectionTo(to));
		} else {
			rv = creep.moveTo(to);
		}
		if (rv != OK) {
			log.e(`[${creep.name}] failed to moveTo [${to}] [${creep.pos}]->[${to}] with error [${errorCodeToString(rv)}]`);
		}
	}
	return rv;
}

abstract class Action<ContextType> {
	readonly actionType: ActionType;
	/*readonly*/ persist: boolean = false;
	/*readonly*/ highway: boolean = false;
	/*readonly*/ callback: (context: ContextType) => any = _.identity;

	constructor(actionType: ActionType) {
		this.actionType = actionType;
	}

	abstract test(creep: Creep, target: any): boolean;

	abstract do(creep: Creep, target: any): ScreepsReturnCode;

	// set a callback to execute on context when running sequence.
	// If multiple targets are involved this lets you pick the correct one for
	// the relevant action.
	setArgs(callback: (context: ContextType) => any) {
		this.callback = callback;
		return this;
	}

	getArgs(context: ContextType) {
		return this.callback(context);
	}

	setHighway() {
		this.highway = true;
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
			rv = moveTo(creep, target.pos, this.highway);
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
			rv = moveTo(creep, target.pos, this.highway);
		}
		return rv;
	}
}

export class Repair<ContextType> extends Action<ContextType> {
	constructor() {
		super(ActionType.REPAIR);
	}

	test(creep: Creep, target: any) {
		return ((target instanceof Structure && isDamaged(target)) || target instanceof ConstructionSite) && hasUsedCapacity(creep);
	}

	do(creep: Creep, target: Structure | ConstructionSite) {
		let rv: ScreepsReturnCode = OK;
		if (creep.pos.inRangeTo(target.pos, REPAIR_RANGE)) {
			rv = target instanceof ConstructionSite ? creep.build(target) : creep.repair(target);
			if (rv != OK) {
				log.e(`[${creep.name}] failed to repair [${target}] with error [${errorCodeToString(rv)}]`);
			}
		} else {
			rv = moveTo(creep, target.pos, this.highway);
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
			rv = moveTo(creep, target.pos, this.highway);
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
			rv = moveTo(creep, target.pos, this.highway);
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
