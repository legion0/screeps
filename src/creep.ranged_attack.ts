import { ActionType, actionTypeName, moveTo, recycle } from './Action';
import { creepActions, rangedAttack } from './actions2';
import { createBodySpec, getBodyForRoom, getBodyForSpawn } from './BodySpec';
import { errorCodeToString, RALLY_RANGE, RANGED_ATTACK_RANGE } from './constants';
import { isAnyCreep } from './Creep';
import { reverseDirection } from './directions';
import { log } from './Logger';
import { BodyPartsCallback, SpawnQueue, SpawnQueuePriority, SpawnRequest } from './SpawnQueue';
import { isStructure } from './Structure';
import { getEnergyAvailableForSpawn, getEnergyCapacityForSpawn } from './structure.spawn.energy';

export function runRangedAttackCreep(creep: Creep, target?: RoomPosition | AnyCreep | Structure) {
  if (creep.spawning) {
    return;
  }

  // Recycle
  if (!target || (creep.getActiveBodyparts(RANGED_ATTACK) == 0 && creep.getActiveBodyparts(HEAL) == 0 && creep.getActiveBodyparts(MOVE))) {
    recycle(creep);
    return;
  }

  // Heal Self
  if (creep.hits < creep.hitsMax && creep.getActiveBodyparts(HEAL)) {
    const rv = creep.heal(creep);
    if (rv != OK) {
      log.e(`[${creep.name}] at pos [${creep.pos}] failed to perform action [${actionTypeName(ActionType.HEAL)}] with error [${errorCodeToString(rv)}]`);
    }
  }

  // Rally
  if (target instanceof RoomPosition) {
    if (!creep.pos.inRangeTo(target, RALLY_RANGE)) {
      creepActions.setAction(creep, ActionType.MOVE, (creep: Creep) => {
        return moveTo(creep, target, /*highway=*/false, RALLY_RANGE);
      });
    }
    return;
  }

  // Attack
  if ((isAnyCreep(target) || isStructure(target)) && creep.getActiveBodyparts(RANGED_ATTACK)) {
    const rv = rangedAttack(creep, target);
    if (rv != OK) {
      log.e(`[${creep.name}] at pos [${creep.pos}] failed to perform action [${actionTypeName(ActionType.RANGED_ATTACK)}] with error [${errorCodeToString(rv)}]`);
    }
  }
  // Also back away while attacking
  if (creep.hits < creep.hitsMax && creep.pos.getRangeTo(target) <= RANGED_ATTACK_RANGE && creep.getActiveBodyparts(MOVE)) {
    const rv = creep.move(reverseDirection(creep.pos.getDirectionTo(target)));
    if (rv != OK) {
      log.e(`[${creep.name}] at pos [${creep.pos}] failed to perform action [${actionTypeName(ActionType.MOVE)}] with error [${errorCodeToString(rv)}]`);
    }
  }
}

export function requestRangedAttackCreepAt(name: string, pos: RoomPosition) {
  const queue = SpawnQueue.getSpawnQueue();
  const creep = Game.creeps[name];
  (creep && creep.ticksToLive) || (creep && creep.spawning) || queue.has(name) || queue.push({
    name,
    bodyPartsCallbackName: bodyPartsCallbackName,
    priority: SpawnQueuePriority.ATTACK,
    time: Game.time,
    pos: pos,
    context: {
      roomName: pos.roomName,
    }
  });
}

function getBodyForEnergy(energy: number) {
  if (energy > /*250*/BODYPART_COST[HEAL] + /*150*/BODYPART_COST[RANGED_ATTACK] + 2 * /*50*/BODYPART_COST[MOVE]) {
    return /*500*/[RANGED_ATTACK, MOVE, MOVE, HEAL];
  } else if (energy > /*10*/BODYPART_COST[TOUGH] + /*150*/BODYPART_COST[RANGED_ATTACK] + 2 * /*50*/BODYPART_COST[MOVE]) {
    return /*260*/[TOUGH, RANGED_ATTACK, MOVE, MOVE];
  }
  return /*200*/[RANGED_ATTACK, MOVE];
}

function bodyPartsCallback(request: SpawnRequest, maxEnergy: number): BodyPartConstant[] {
  const room = Game.rooms[request.context.roomName];
  if (room.find(FIND_HOSTILE_CREEPS).length == 0) {
    return null;
  }
  return getBodyForEnergy(maxEnergy);
}

const bodyPartsCallbackName = 'RangedAttackCreep' as Id<BodyPartsCallback>;

SpawnQueue.registerBodyPartsCallback(bodyPartsCallbackName, bodyPartsCallback);