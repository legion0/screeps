import { ActionType, moveTo, recycle } from './Action';
import { attack, creepActions } from './actions2';
import { createBodySpec, getBodyForRoom, getBodyForSpawn } from './BodySpec';
import { isAnyCreep } from './Creep';
import { BodyPartsCallback, SpawnQueue, SpawnQueuePriority, SpawnRequest } from './SpawnQueue';
import { isStructure } from './Structure';

export function runAttackCreep(creep: Creep, target?: RoomPosition | AnyCreep | Structure) {
  if (creep.spawning) {
    return;
  }

  if (creep.getActiveBodyparts(ATTACK) == 0) {
    recycle(creep);
    return;
  }

  if (target && (isAnyCreep(target) || isStructure(target))) {
    creepActions.setAction(creep, ActionType.ATTACK, (creep: Creep) => {
      return attack(creep, target);;
    });
    return;
  } else if (target instanceof RoomPosition && !creep.pos.isNearTo(target)) {
    creepActions.setAction(creep, ActionType.MOVE, (creep: Creep) => {
      return moveTo(creep, target, /*highway=*/false, /*range=*/1);
    });
    return;
  }

  recycle(creep);
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

const bodySpec = createBodySpec([
  [ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE],
  [ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE],
  [ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE],
  [ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE],
  [ATTACK, MOVE, ATTACK, MOVE],
  [ATTACK, MOVE],
]);

function bodyPartsCallback(request: SpawnRequest, spawn?: StructureSpawn): BodyPartConstant[] {
  const room = Game.rooms[request.context.roomName];
  if (room.find(FIND_HOSTILE_CREEPS).length == 0) {
    return null;
  }
  if (spawn) {
    return getBodyForSpawn(spawn, bodySpec);
  } else {
    return getBodyForRoom(room, bodySpec);
  }
}

const bodyPartsCallbackName = 'AttackCreep' as Id<BodyPartsCallback>;

SpawnQueue.registerBodyPartsCallback(bodyPartsCallbackName, bodyPartsCallback);
