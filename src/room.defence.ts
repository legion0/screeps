import { requestAttackCreepAt, runAttackCreep } from './creeps.attack';

function runRoomDefence(room: Room) {
  const hostile = room.find(FIND_HOSTILE_CREEPS)[0];
  if (hostile) {
    requestAttackCreepAt('atk1', hostile.pos);
  }
  let creep = Game.creeps['atk1'];
  if (creep) {
    runAttackCreep(creep, hostile);
  }
}

export function runRoomDefences() {
  for (const room of Object.values(Game.rooms)) {
    runRoomDefence(room);
  }
}
