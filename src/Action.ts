import { BUILD_RANGE, errorCodeToString, REPAIR_RANGE, UPGRADE_RANGE } from './constants';
import { Highway } from './Highway';
import { log } from './Logger';
import { memInit } from './Memory';
import { getRecyclePos } from './Room';
import { fromMemoryWorld, lookNear, RoomPositionMemory, toMemoryRoom, toMemoryWorld, fromMemoryRoom } from './RoomPosition';
import { getFreeCapacity, hasFreeCapacity, hasUsedCapacity } from './Store';
import { isDamaged, isSpawn } from './Structure';
import { events, EventEnum } from './Events';

declare global {
	interface CreepMemory {
		lastAction?: ActionType;
		highway?: {
			path: RoomPositionMemory[];
			from?: RoomPositionMemory;
		};
		lastPos?: {
			pos: RoomPositionMemory;
			since: number;
		};
	}
	interface Memory {
		creepSayAction?: boolean;
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

function creepUpdateMoveTicker(creep: Creep) {
	if (creep.memory.lastPos && creep.fatigue) {
		creep.memory.lastPos.since = Game.time;
	} else	if (creep.memory.lastPos &&
		!creep.pos.isEqualTo(fromMemoryRoom(creep.memory.lastPos.pos, creep.pos.roomName))) {
		creep.memory.lastPos.pos = toMemoryRoom(creep.pos);
		creep.memory.lastPos.since = Game.time;
	}
}

function creepStuckDuration(creep: Creep) {
	const lastPos = memInit(creep.memory, 'lastPos', {
		pos: toMemoryRoom(creep.pos),
		since: Game.time,
	});
	return Game.time - lastPos.since;
}

const HIGHWAY_RANGE = 3;

function getFrom(creep: Creep, to: RoomPosition): RoomPosition | undefined {
	if (!creep.memory.highway) {
		log.e(`getFrom requires highway`);
		return undefined;
	}
	if (creep.pos.getRangeTo(to) <= HIGHWAY_RANGE) {
		creep.memory.highway.from = toMemoryWorld(to);
		return undefined;
	} else if (!creep.memory.highway.from) {
		return undefined;
	}
	let from = fromMemoryWorld(creep.memory.highway.from);
	if (from.isEqualTo(to)) {
		// Turned around (e.g. out of energy building highway on path to target)
		from = Highway.findHighway(creep.pos, to);
		if (from) {
			creep.memory.highway.from = toMemoryWorld(from);
			return from;
		}
		return undefined;
	}
	return from;
}

function buildHighway(creep: Creep, from: RoomPosition, to: RoomPosition) {
	if (Memory.highwayDebugVisuals) {
		creep.room.visual.line(from.x, from.y, to.x, to.y, { color: 'blue' });
		creep.room.visual.line(from.x, from.y, creep.pos.x, creep.pos.y, { color: 'blue' });
		creep.room.visual.line(creep.pos.x, creep.pos.y, to.x, to.y, { color: 'blue' });
	}
	return new Highway(from, to).build();
}

function getNextHighwaySegment(
	creep: Creep, current: RoomPosition, to: RoomPosition
): RoomPosition[] | ScreepsReturnCode {
	const from = getFrom(creep, to);
	if (from && from.getRangeTo(to) >= 10) {
		const highway = buildHighway(creep, from, to);
		if (highway instanceof Highway) {
			const path = highway.buildRoad().nextSegment(current, to);
			creep.memory.highway!.path = path.map(toMemoryWorld);
			return path;
		}
		log.e(`[${creep.name}] failed to build highway [${from}]->[${to}] with error [${errorCodeToString(highway)}]`);
		return highway;
	}
	return OK;
}

function getNextHighwayWaypoint(creep: Creep, to: RoomPosition): RoomPosition | ScreepsReturnCode {
	memInit(creep.memory, 'highway', { path: [] });
	let current = creep.pos;
	let path = creep.memory.highway!.path.map(fromMemoryWorld);
	if (path.length && creepStuckDuration(creep) > CREEP_STUCK_INTERVAL) {
		// Log.w(`Creep [${creep}] stuck, moving to next highway position`);
		current = path.shift()!;
		creep.memory.highway!.path.shift();
	}
	if (path.length && path[0].isEqualTo(creep.pos)) {
		path.shift();
		creep.memory.highway!.path.shift();
	}
	if (!path.length) {
		const nextSegment = getNextHighwaySegment(creep, current, to);
		if (nextSegment instanceof Array) {
			path = nextSegment;
		} else {
			return nextSegment;
		}
	}
	if (!path.length) {
		return creep.pos.getRangeTo(to) < 4 ? ERR_NO_PATH : OK;
	}
	if (Memory.highwayDebugVisuals) {
		creep.room.visual.poly(path, { stroke: 'red' });
		creep.room.visual.circle(path[0].x, path[0].y, { fill: 'red' });
	}
	return path[0];
}

export function moveTo(creep: Creep, to: RoomPosition, highway: boolean, range: number) {
	if (creep.fatigue) {
		return OK;
	}
	let rv: ScreepsReturnCode = OK;
	let nextHighwayWaypoint: RoomPosition | undefined;
	if (highway) {
		const highwayRv = getNextHighwayWaypoint(creep, to);
		if (highwayRv instanceof RoomPosition) {
			nextHighwayWaypoint = highwayRv;
		} else if (highwayRv !== OK) {
			log.e(`Creep [${creep}] at [${creep.pos}] failed to walk highway from [${creep.memory.highway?.from}] to [${to}] with error [${errorCodeToString(highwayRv)}]`);
		}
	}
	const nextWaypoint = nextHighwayWaypoint ? nextHighwayWaypoint : to;
	if (creep.pos.isNearTo(nextWaypoint)) {
		rv = creep.move(creep.pos.getDirectionTo(nextWaypoint));
	} else {
		rv = creep.moveTo(nextWaypoint);
	}
	if (rv !== OK && (rv !== ERR_NO_PATH || Game.time % 50 === 0)) {
		// need to figure out why am i trying to move to my current position via a highway waypoint
		// idea: it might be the next point in the stored highway?
		// ERROR   127376 [UpgradeController.W7N7.1] failed to moveTo
		// [[room W7N7 pos 15,10]] via [[room W7N7 pos 4,12]]
		// step: [[room W7N7 pos 4,12]]->[[room W7N7 pos 4,12]]
		// with error [ERR_INVALID_ARGS] [moveTo main:1517:13]
		log.e(`[${creep.name}] failed to moveTo [${to}] via [${nextHighwayWaypoint}] step: [${creep.pos}]->[${nextWaypoint}] with error [${errorCodeToString(rv)}]`);
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
		creep.moveTo(recyclePos);
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
	if (creep.spawning) {
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
}

events.listen(EventEnum.EVENT_TICK_START, () => {
	Object.values(Game.creeps).forEach((c) => creepUpdateMoveTicker(c));
});
