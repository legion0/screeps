export function errorCodeToString(errorCode: ScreepsReturnCode): string {
	switch (errorCode) {
		case OK:
			return 'OK';
		case ERR_NOT_OWNER:
			return 'ERR_NOT_OWNER';
		case ERR_NO_PATH:
			return 'ERR_NO_PATH';
		case ERR_BUSY:
			return 'ERR_BUSY';
		case ERR_NAME_EXISTS:
			return 'ERR_NAME_EXISTS';
		case ERR_NOT_FOUND:
			return 'ERR_NOT_FOUND';
		case ERR_NOT_ENOUGH_RESOURCES:
			return 'ERR_NOT_ENOUGH_RESOURCES';
		case ERR_NOT_ENOUGH_ENERGY:
			return 'ERR_NOT_ENOUGH_ENERGY';
		case ERR_INVALID_TARGET:
			return 'ERR_INVALID_TARGET';
		case ERR_FULL:
			return 'ERR_FULL';
		case ERR_NOT_IN_RANGE:
			return 'ERR_NOT_IN_RANGE';
		case ERR_INVALID_ARGS:
			return 'ERR_INVALID_ARGS';
		case ERR_TIRED:
			return 'ERR_TIRED';
		case ERR_NO_BODYPART:
			return 'ERR_NO_BODYPART';
		case ERR_NOT_ENOUGH_EXTENSIONS:
			return 'ERR_NOT_ENOUGH_EXTENSIONS';
		case ERR_RCL_NOT_ENOUGH:
			return 'ERR_RCL_NOT_ENOUGH';
		case ERR_GCL_NOT_ENOUGH:
			return 'ERR_GCL_NOT_ENOUGH';
		default:
			return 'ERR_UNKNOWN';
	}
}

export function isErrorCode(value: any): value is ScreepsReturnCode {
	return _.isNumber(value);
}

export const ROOM_WIDTH = 50;
export const ROOM_HEIGHT = 50;
export const REPAIR_RANGE = 3;
export const BUILD_RANGE = 3;
export const UPGRADE_RANGE = 3;
export const RANGED_ATTACK_RANGE = 3;
export const RALLY_RANGE = 3;

export const TERRAIN_PLAIN = 'plain';
export const TERRAIN_SWAMP = 'swamp';

/*
 * Spawn time 3 ticks per each body part
 * https://docs.screeps.com/api/#StructureSpawn
 */
export const BODY_PART_SPAWN_TIME = 3;

export const GENERIC_WORKER = [WORK, CARRY, MOVE, MOVE];

export type Direction = BOTTOM | TOP | LEFT | RIGHT | BOTTOM_LEFT | BOTTOM_RIGHT | TOP_LEFT | TOP_RIGHT;
