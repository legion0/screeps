import { ActionType, actionTypeName, moveTo, recycle } from './Action';
import { attack, creepActions } from './actions2';
import { errorCodeToString, RALLY_RANGE } from './constants';
import { isAnyCreep } from './Creep';
import { reverseDirection } from './directions';
import { log } from './Logger';
import { BodyPartsCallback, SpawnQueue, SpawnQueuePriority, SpawnRequest } from './SpawnQueue';
import { isStructure } from './Structure';
import { getEnergyAvailableForSpawn, getEnergyCapacityForSpawn } from './structure.spawn.energy';

export function runAttackCreep(creep: Creep, target?: RoomPosition | AnyCreep | Structure) {
  if (creep.spawning) {
    return;
  }

  // Recycle
  if (!target || (creep.getActiveBodyparts(ATTACK) == 0 && creep.getActiveBodyparts(HEAL) == 0)) {
    recycle(creep);
    return;
  }

  // Heal Self
  if (creep.hits < creep.hitsMax && (!creep.pos.isNearTo(target) || target instanceof RoomPosition) && creep.getActiveBodyparts(HEAL) > 0) {
    const rv = creep.heal(creep);
    if (rv != OK) {
      log.e(`[${creep.name}] at pos [${creep.pos}] failed to perform action [${actionTypeName(ActionType.HEAL)}] with error [${errorCodeToString(rv)}]`);
    }
  }

  // Flee
  if (creep.getActiveBodyparts(ATTACK) == 0) {
    creepActions.setAction(creep, ActionType.MOVE, (creep: Creep) => {
      return creep.move(reverseDirection(creep.pos.getDirectionTo(target)));
    });
    return;
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
  if (isAnyCreep(target) || isStructure(target)) {
    creepActions.setAction(creep, ActionType.RANGED_ATTACK, (creep: Creep) => {
      return attack(creep, target);
    });
    return;
  }
}

export function requestAttackCreepAt(name: string, pos: RoomPosition) {
  const queue = SpawnQueue.getSpawnQueue();
  queue.has(name) || queue.push({
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
  if (energy >= /*250*/BODYPART_COST[HEAL] + /*80*/BODYPART_COST[ATTACK] + 2 * /*50*/BODYPART_COST[MOVE]) {
    return /*430*/[ATTACK, MOVE, MOVE, HEAL];
  } else if (energy >= 2 * /*80*/BODYPART_COST[ATTACK] + 2 * /*50*/BODYPART_COST[MOVE]) {
    return /*260*/[ATTACK, ATTACK, MOVE, MOVE];
  } else if (energy >= 2 * /*10*/BODYPART_COST[TOUGH] + /*80*/BODYPART_COST[ATTACK] + 3 * /*50*/BODYPART_COST[MOVE]) {
    return /*250*/[TOUGH, TOUGH, ATTACK, MOVE, MOVE, MOVE];
  } else if (energy >= /*10*/BODYPART_COST[TOUGH] + /*80*/BODYPART_COST[ATTACK] + 2 * /*50*/BODYPART_COST[MOVE]) {
    return /*190*/[TOUGH, ATTACK, MOVE, MOVE];
  }
  return /*130*/[ATTACK, MOVE];
}

function bodyPartsCallback(request: SpawnRequest, maxEnergy: number): BodyPartConstant[] {
  const room = Game.rooms[request.context.roomName];
  if (room.find(FIND_HOSTILE_CREEPS).length == 0) {
    return null;
  }
  return getBodyForEnergy(maxEnergy);
}

const bodyPartsCallbackName = 'AttackCreep' as Id<BodyPartsCallback>;

SpawnQueue.registerBodyPartsCallback(bodyPartsCallbackName, bodyPartsCallback);
