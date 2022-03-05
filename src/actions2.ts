import { ActionType, actionTypeName, moveTo, PickupTarget, TransferTarget, WithdrawTarget } from './Action';
import { BUILD_RANGE, errorCodeToString, REPAIR_RANGE, UPGRADE_RANGE } from './constants';
import { log } from './Logger';
import { findMySpawns } from './Room';
import { getFreeCapacity } from './Store';

declare global {
  interface Memory {
    logCreepActions?: boolean;
  }
}

export function transferToTarget(creep: Creep, target: TransferTarget) {
  if (Memory.creepSayAction) {
    creep.say('TRANSFER');
  }
  // if (!hasFreeCapacity(target)) {
  // 	return ERR_FULL;
  // }else if (!hasUsedCapacity(creep)) {
  // 	return ERR_NOT_ENOUGH_ENERGY;
  // }

  if (creep.pos.isNearTo(target)) {
    return creep.transfer(
      target,
      RESOURCE_ENERGY,
      Math.min(
        creep.store.energy,
        getFreeCapacity(target)
      )
    );
  } else {
    return moveTo(creep, target.pos, /*highway=*/false, /*range=*/1);
  }
}

export function build(creep: Creep, target: ConstructionSite) {
  if (creep.pos.inRangeTo(target.pos, BUILD_RANGE)) {
    return creep.build(target);
  } else {
    return moveTo(creep, target.pos, /*highway=*/false, /*range=*/BUILD_RANGE);
  }
}

export function repair(creep: Creep, target: Structure) {
  if (creep.pos.inRangeTo(target.pos, REPAIR_RANGE)) {
    return creep.repair(target);
  } else {
    return moveTo(creep, target.pos, /*highway=*/false, /*range=*/REPAIR_RANGE);
  }
}

export function attack(creep: Creep, target: AnyCreep | Structure) {
  if (creep.pos.isNearTo(target.pos)) {
    return creep.attack(target);
  } else {
    return moveTo(creep, target.pos, /*highway=*/false, /*range=*/1);
  }
}

export function upgradeController(creep: Creep, target: StructureController) {
  if (creep.pos.inRangeTo(target.pos, UPGRADE_RANGE)) {
    return creep.upgradeController(target);
  } else {
    return moveTo(creep, target.pos, /*highway=*/false, /*range=*/UPGRADE_RANGE);
  }
}

export function harvest(creep: Creep, target: Source) {
  if (creep.pos.isNearTo(target.pos)) {
    return creep.harvest(target);
  } else {
    return moveTo(creep, target.pos, /*highway=*/false, /*range=*/1);
  }
}

export function pickupResource(creep: Creep, target: PickupTarget) {
  // if (!hasFreeCapacity(creep)) {
  // 	return ERR_FULL;
  // } else if (!hasUsedCapacity(target)) {
  // 	return ERR_NOT_ENOUGH_ENERGY;
  // }

  if (creep.pos.isNearTo(target)) {
    return creep.pickup(target);
  } else {
    return moveTo(creep, target.pos, /*highway=*/false, /*range=*/1);
  }
}

export function withdrawFromTarget(creep: Creep, target: WithdrawTarget) {
  if (creep.pos.isNearTo(target.pos)) {
    return creep.withdraw(target, RESOURCE_ENERGY);
  } else {
    return moveTo(creep, target.pos, /*highway=*/false, /*range=*/1);
  }
}

// if the creep has nothing else to do it can move to an idle positioin where its not blocking anyone
export function idle(creep: Creep) {
  const spawn = findMySpawns(creep.room)?.[0];
  if (spawn && !creep.pos.inRangeTo(spawn.pos, 2)) {
    return moveTo(creep, spawn.pos, /*highway=*/false, /*range=*/2);
  }
}

type ActionCallback = (creep: Creep) => ScreepsReturnCode;
type ActionEntry = { actionType: ActionType, actionCallback: ActionCallback; };

class CreepActions {
  setAction(creep: Creep, actionType: ActionType, actionCallback: ActionCallback) {
    if (Memory.logCreepActions) {
      log.d(creep.name, actionTypeName(actionType));
    }
    this.actionCache_.set(creep.name, {
      actionType: actionType,
      actionCallback: actionCallback,
    });
  }

  runActions() {
    for (const [creepName, actionEntry] of this.actionCache_.entries()) {
      const creep = Game.creeps[creepName];
      if (Memory.creepSayAction) {
        creep.say(actionTypeName(actionEntry.actionType));
      }
      const rv = actionEntry.actionCallback(creep);
      if (Memory.logCreepActions) {
        log.i(creep.name, actionTypeName(actionEntry.actionType), errorCodeToString(rv));
      }
      if (rv != OK) {
        log.e(`[${creep.name}] at pos [${creep.pos}] failed to perform action [${actionTypeName(actionEntry.actionType)}] with error [${errorCodeToString(rv)}]`);
      }
    }
    this.actionCache_.clear();
  }

  private actionCache_: Map<string, ActionEntry> = new Map();
}

export const creepActions = new CreepActions();
