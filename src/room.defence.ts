import { requestRangedAttackCreepAt, runRangedAttackCreep } from './creep.rangedAttack';
import { requestAttackCreepAt, runAttackCreep } from './creeps.attack';

function runRoomDefence(room: Room) {
  const hostile = room.find(FIND_HOSTILE_CREEPS)[0];
  if (hostile) {
    // TODO: make creep request stateful, we don't want to switch to requesting a non ranged creep if we damage the creep and destroy the RANGED_ATTACK body part.
    if (hostile.getActiveBodyparts(RANGED_ATTACK)) {
      requestRangedAttackCreepAt('rng_atk1', hostile.pos);
    } else if (hostile.getActiveBodyparts(ATTACK)) {
      requestAttackCreepAt('atk1', hostile.pos);
    }
  }
  let creep = Game.creeps['atk1'];
  if (creep) {
    runAttackCreep(creep, hostile);
  }
  creep = Game.creeps['rng_atk1'];
  if (creep) {
    runRangedAttackCreep(creep, hostile);
  }
}

export function runRoomDefences() {
  for (const room of Object.values(Game.rooms)) {
    runRoomDefence(room);
  }
}
