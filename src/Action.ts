import { BUILD_RANGE, errorCodeToString, REPAIR_RANGE, UPGRADE_RANGE } from './constants';
import { creepIsSpawning } from './Creep';
import { EventEnum, events } from './Events';
import { Highway, HIGHWAY_SEARCH_RADIUS } from './Highway';
import { log } from './Logger';
import { memInit } from './Memory';
import { getRecyclePos } from './Room';
import { fromMemoryRoom, fromMemoryWorld, lookNear, RoomPositionMemory, toMemoryRoom, toMemoryWorld } from './RoomPosition';
import { getFreeCapacity, hasFreeCapacity, hasUsedCapacity } from './Store';
import { isDamaged, isSpawn } from './Structure';

declare global {
	interface CreepMemory {
		lastAction?: ActionType;
		highway?: {
			name: string;
			path: RoomPositionMemory[];
		};
		lastPos?: {
			pos: RoomPositionMemory;
			since: number;
		};
	}
	interface Memory {
		creepSayAction?: boolean;
		creepSayName?: boolean;
		highwayDebugVisuals?: boolean;
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
	HARVEST,
	ATTACK,
	DISMANTLE,
	ATTACK_CONTROLLER,
	RANGED_HEAL,
	HEAL,
	RANGED_ATTACK,
	RANGED_MASS_ATTACK,
	TRANSFER,
	DROP,
}

export function actionTypeName(actionType: ActionType) {
	switch (actionType) {
		case ActionType.MOVE:
			return "MOVE";
		case ActionType.DEPOSIT:
			return "DEPOSIT";
		case ActionType.REPAIR:
			return "REPAIR";
		case ActionType.BUILD:
			return "BUILD";
		case ActionType.PICKUP:
			return "PICKUP";
		case ActionType.UPGRADE_CONTROLLER:
			return "UPGRADE_CONTROLLER";
		case ActionType.WITHDRAW:
			return "WITHDRAW";
		case ActionType.HARVEST:
			return "HARVEST";
		case ActionType.ATTACK:
			return "ATTACK";
		case ActionType.DISMANTLE:
			return "DISMANTLE";
		case ActionType.ATTACK_CONTROLLER:
			return "ATTACK_CONTROLLER";
		case ActionType.RANGED_HEAL:
			return "RANGED_HEAL";
		case ActionType.HEAL:
			return "HEAL";
		case ActionType.RANGED_ATTACK:
			return "RANGED_ATTACK";
		case ActionType.TRANSFER:
			return "TRANSFER";
		case ActionType.DROP:
			return "DROP";
	}
}

// const ORDER1 = [
// 	ActionType.HARVEST,
// 	ActionType.ATTACK,
// 	ActionType.BUILD,
// 	ActionType.REPAIR,
// 	ActionType.DISMANTLE,
// 	ActionType.ATTACK_CONTROLLER,
// 	ActionType.RANGED_HEAL,
// 	ActionType.HEAL,
// ];
// const ORDER2 = [
// 	ActionType.RANGED_ATTACK,
// 	ActionType.RANGED_MASS_ATTACK,
// 	ActionType.BUILD,
// 	ActionType.RANGED_HEAL,
// ];
// // Only when not enough energy to do everything:
// const ORDER3 = [
// 	ActionType.UPGRADE_CONTROLLER,
// 	ActionType.BUILD,
// 	ActionType.REPAIR,
// 	ActionType.WITHDRAW,
// 	ActionType.TRANSFER,
// 	ActionType.DROP,
// ];


const CREEP_STUCK_INTERVAL = 3;

function creepStuckDuration(creep: Creep) {
	const lastPos = memInit(creep.memory, 'lastPos', {
		pos: toMemoryRoom(creep.pos),
		since: Game.time,
	});
	return Game.time - lastPos.since;
}

function isCreepStuck(creep: Creep) {
	return creepStuckDuration(creep) >= CREEP_STUCK_INTERVAL;
}

const HIGHWAY_NAVIGTION_RANGE = 8;

function getNextHighwayWaypoint(creep: Creep, target: RoomPosition) {
	// console.log(`getNextHighwayWaypoint: creep.pos: [${creep.pos}], target: [${target}]`);
	if (!creep.memory.highway) {
		const highway = Highway.findHighway(creep.pos, target);
		if (!highway) {
			return ERR_NOT_FOUND;
		}
		creep.memory.highway = {
			name: highway.getName(),
			path: [],
		};
		return getNextHighwayWaypoint(creep, target);
	}
	const highway = Highway.loadHighway(creep.memory.highway.name);
	if (highway == null || !highway.exits().some(pos => pos.getRangeTo(target) < HIGHWAY_SEARCH_RADIUS)) {
		delete creep.memory.highway;
		return getNextHighwayWaypoint(creep, target);
	}

	return getNextHighwayWaypointR(creep, creep.pos, target, highway);
}

function getNextHighwayWaypointR(creep: Creep, current: RoomPosition, target: RoomPosition, highway: Highway): RoomPosition | ScreepsReturnCode {
	// console.log(`getNextHighwayWaypoint: creep.pos: [${creep.pos}], current: [${current}], target: [${target}], highway: [${highway}]`);
	if (creep.memory.highway.path.length) {
		const next = fromMemoryWorld(creep.memory.highway.path[0]);
		// if we succesfully advanced to the next position, remove from memory and get the next postion.
		if (current.isEqualTo(next)) {
			creep.memory.highway.path.shift();
			return getNextHighwayWaypointR(creep, current, target, highway);
		}
		if (Memory.highwayDebugVisuals) {
			const path = creep.memory.highway.path.map(fromMemoryWorld);
			creep.room.visual.poly(path, { stroke: 'red' });
			creep.room.visual.circle(next.x, next.y, { fill: 'red' });
		}
		return next;
	}
	// If we don't have a stored path, load the next segment into memory and re run this function.
	const nextSegment = highway.nextSegment(current, target);
	if (!nextSegment.length) {
		return ERR_NOT_FOUND;
	}
	creep.memory.highway.path = nextSegment.map(toMemoryWorld);
	return getNextHighwayWaypointR(creep, current, target, highway);
}

export function moveTo(creep: Creep, target: RoomPosition, useHighways: boolean, range: number) {
	if (creep.fatigue) {
		return OK;
	}
	let rv: ScreepsReturnCode = OK;
	let nextWaypoint: RoomPosition = null;
	// TODO: after the creep gets unstuck it can immediately go back to the
	// highway, need to fix this and do short detourts around obstacle.
	if (!isCreepStuck(creep) && (creep.memory.highway?.path?.length || creep.pos.getRangeTo(target) > HIGHWAY_NAVIGTION_RANGE)) {
		const highwayNextWaypoint = getNextHighwayWaypoint(creep, target);
		if (highwayNextWaypoint instanceof RoomPosition) {
			nextWaypoint = highwayNextWaypoint;
		} else {
			if (highwayNextWaypoint != ERR_NOT_FOUND) {
				log.e(`Creep [${creep}] at [${creep.pos}] failed to walk highway from [${creep.pos}] to [${target}] with error [${errorCodeToString(highwayNextWaypoint)}]`);
			}
			if (creep.memory.highway) {
				delete creep.memory.highway;
			}
		}
	}
	if (!nextWaypoint) {
		nextWaypoint = target;
	}

	if (creep.pos.isNearTo(nextWaypoint)) {
		rv = creep.move(creep.pos.getDirectionTo(nextWaypoint));
	} else {
		rv = creep.moveTo(nextWaypoint);
	}
	if (rv !== OK && rv !== ERR_NO_PATH) {
		log.e(`[${creep.name}] failed to moveTo [${target}] via [${nextWaypoint}] step: [${creep.pos}]->[${nextWaypoint}] with error [${errorCodeToString(rv)}]`);
	}

	return rv;
}

export function recycle(creep: Creep) {
	const recyclePos = getRecyclePos(creep.room);

	if (!recyclePos) {
		return;
	}
	if (creep.pos.isEqualTo(recyclePos)) {
		const spawn = lookNear(
			recyclePos,
			LOOK_STRUCTURES,
			isSpawn
		)[0] as StructureSpawn;

		if (spawn) {
			const rv = spawn.recycleCreep(creep);

			if (rv !== OK) {
				log.e(`[${creep.name}] failed to be recycled by [${spawn}] at [${creep.pos}] with error [${errorCodeToString(rv)}]`);
			}
		} else {
			log.e(`[${creep.name}] failed to find spawn for recycling at recycle pos [${creep.pos}]`);
		}
	} else {
		return moveTo(creep, recyclePos, /*useHighways=*/false, /*range=*/1);
	}
}

abstract class Action<ContextType> {
	readonly actionType: ActionType;

	/* Readonly*/ persist: boolean = false;

	/* Readonly*/ highway: boolean = false;

	/* Readonly*/ callback: (context: ContextType) => any = _.identity;

	constructor(actionType: ActionType) {
		this.actionType = actionType;
	}

	abstract test(creep: Creep, target: any): boolean;

	abstract do(creep: Creep, target: any): ScreepsReturnCode;

	// Set a callback to execute on context when running sequence.
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

export type TransferTarget = StructureSpawn |
	StructureExtension |
	StructureContainer |
	StructureTower |
	StructureStorage;


export function isTransferTarget(o: any): o is TransferTarget {
	return o instanceof StructureSpawn ||
		o instanceof StructureExtension ||
		o instanceof StructureContainer ||
		o instanceof StructureTower ||
		o instanceof StructureStorage;
}

export class Transfer<ContextType> extends Action<ContextType> {
	constructor() {
		super(ActionType.TRANSFER);
	}

	test(creep: Creep, target: any) {
		return isTransferTarget(target) &&
			hasFreeCapacity(target) && hasUsedCapacity(creep);
	}

	do(creep: Creep, target: TransferTarget) {
		let rv: ScreepsReturnCode = OK;

		if (creep.pos.isNearTo(target)) {
			rv = creep.transfer(
				target,
				RESOURCE_ENERGY,
				Math.min(
					creep.store.energy,
					getFreeCapacity(target)
				)
			);
			if (rv !== OK) {
				log.e(`[${creep.name}] failed to transfer to [${target}] with error [${errorCodeToString(rv)}]`);
			}
		} else {
			rv = moveTo(creep, target.pos, this.highway, 1);
		}

		return rv;
	}

	setArgs(callback: (context: ContextType) => TransferTarget | undefined) {
		return super.setArgs(callback);
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
			if (rv !== OK) {
				log.e(`[${creep.name}] failed to build [${target}] with error [${errorCodeToString(rv)}]`);
			}
		} else {
			rv = moveTo(creep, target.pos, this.highway, BUILD_RANGE);
		}

		return rv;
	}

	setArgs(callback: (context: ContextType) => ConstructionSite | undefined) {
		return super.setArgs(callback);
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
			if (rv !== OK) {
				log.e(`[${creep.name}] failed to repair [${target}] with error [${errorCodeToString(rv)}]`);
			}
		} else {
			rv = moveTo(creep, target.pos, this.highway, REPAIR_RANGE);
		}
		return rv;
	}

	setArgs(callback: (context: ContextType) => Structure | undefined) {
		return super.setArgs(callback);
	}
}

export type PickupTarget = Resource;

export function isPickupTarget(o: any): o is PickupTarget {
	return o instanceof Resource;
}

export class Pickup<ContextType> extends Action<ContextType> {
	constructor() {
		super(ActionType.PICKUP);
	}

	test(creep: Creep, target: any) {
		return isPickupTarget(target) && hasFreeCapacity(creep);
	}

	do(creep: Creep, target: PickupTarget) {
		let rv: ScreepsReturnCode = OK;
		if (creep.pos.isNearTo(target)) {
			rv = creep.pickup(target);
			if (rv !== OK) {
				log.e(`[${creep.name}] failed to pickup [${target}] with error [${errorCodeToString(rv)}]`);
			}
		} else {
			rv = moveTo(creep, target.pos, this.highway, 1);
		}
		return rv;
	}

	setArgs(callback: (context: ContextType) => PickupTarget | undefined) {
		return super.setArgs(callback);
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
			if (rv !== OK) {
				log.e(`[${creep.name}] failed to upgradeController [${target}] with error [${errorCodeToString(rv)}]`);
			}
		} else {
			rv = moveTo(creep, target.pos, this.highway, UPGRADE_RANGE);
		}
		return rv;
	}

	setArgs(callback: (context: ContextType) => StructureController | undefined) {
		return super.setArgs(callback);
	}
}

export type WithdrawTarget = Tombstone |
	Ruin |
	StructureContainer |
	StructureSpawn |
	StructureExtension |
	StructureTower |
	StructureStorage;

export function isWithdrawTarget(o: any): o is WithdrawTarget {
	return o instanceof Tombstone ||
		o instanceof Ruin ||
		o instanceof StructureContainer ||
		o instanceof StructureSpawn ||
		o instanceof StructureExtension ||
		o instanceof StructureTower ||
		o instanceof StructureStorage;
}

export class Withdraw<ContextType> extends Action<ContextType> {
	constructor() {
		super(ActionType.WITHDRAW);
	}

	test(creep: Creep, target: any): boolean {
		return isWithdrawTarget(target) && hasFreeCapacity(creep) && hasUsedCapacity(target);
	}

	do(creep: Creep, target: WithdrawTarget): ScreepsReturnCode {
		let rv: ScreepsReturnCode = OK;

		if (creep.pos.isNearTo(target.pos)) {
			rv = creep.withdraw(target, RESOURCE_ENERGY);
			if (rv !== OK) {
				log.e(`[${creep.name}] failed to withdraw from [${target}] with error [${errorCodeToString(rv)}]`);
			}
		} else {
			rv = moveTo(creep, target.pos, this.highway, 1);
		}

		return rv;
	}

	setArgs(callback: (context: ContextType) => WithdrawTarget | undefined) {
		return super.setArgs(callback);
	}
}

export class Harvest<ContextType> extends Action<ContextType> {
	constructor() {
		super(ActionType.HARVEST);
	}

	test(creep: Creep, target: any) {
		if (target instanceof Mineral || target instanceof Deposit) {
			throw new Error('Harvest of Mineral/Deposit not implemented.');
		}
		// || target instanceof Mineral || target instanceof Deposit
		return target instanceof Source && hasFreeCapacity(creep) && hasUsedCapacity(target);
	}

	do(creep: Creep, target: Source | Mineral | Deposit): ScreepsReturnCode {
		let rv: ScreepsReturnCode = OK;

		if (creep.pos.isNearTo(target.pos)) {
			rv = creep.harvest(target);
			if (rv !== OK) {
				log.e(`[${creep.name}] failed to harvest from [${target}] with error [${errorCodeToString(rv)}]`);
			}
		} else {
			rv = moveTo(creep, target.pos, this.highway, 1);
		}

		return rv;
	}

	setArgs(callback: (context: ContextType) => Source | Mineral | Deposit | undefined) {
		return super.setArgs(callback);
	}
}

export function runSequence<T>(sequence: Action<T>[], creep: Creep, context: any) {
	if (creepIsSpawning(creep)) {
		return;
	}
	let chosenAction: Action<T> | undefined;
	let chosenTarget: any = null;
	// First try to find the persistent action we started last round and see if its still applicable
	if (creep.memory.lastAction) {
		const { lastAction } = creep.memory;
		delete creep.memory.lastAction;
		for (const action of sequence) {
			if (action.persist && action.actionType === lastAction) {
				const target = action.getArgs(context);
				if (action.test(creep, target)) {
					chosenAction = action;
					chosenTarget = target;
					break;
				}
			}
		}
	}
	// Next try regular actions
	if (chosenAction === undefined) {
		for (const action of sequence) {
			const target = action.getArgs(context);
			if (action.test(creep, target)) {
				chosenAction = action;
				chosenTarget = target;
				break;
			}
		}
	}
	// Run the action
	if (chosenAction) {
		chosenAction.do(creep, chosenTarget);
		if (chosenAction.persist) {
			creep.memory.lastAction = chosenAction.actionType;
		}
		if (Memory.creepSayAction) {
			creep.say(ActionType[chosenAction.actionType]);
		}
	} else if (Memory.creepSayAction) {
		creep.say('.');
	}
	if (Memory.creepSayName) {
		creep.say(creep.name);
	}
}

function creepUpdateMoveTicker(creep: Creep) {
	if (creep.memory.lastPos && creep.fatigue) {
		creep.memory.lastPos.since = Game.time;
	} else if (creep.memory.lastPos &&
		!creep.pos.isEqualTo(fromMemoryRoom(creep.memory.lastPos.pos, creep.pos.roomName))) {
		creep.memory.lastPos.pos = toMemoryRoom(creep.pos);
		creep.memory.lastPos.since = Game.time;
	}
}

events.listen(EventEnum.EVENT_TICK_START, () => {
	Object.values(Game.creeps).forEach((c) => creepUpdateMoveTicker(c));
});
