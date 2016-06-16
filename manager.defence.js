var CONSTANTS = require('constants');
var events = require('events');

events.listen(CONSTANTS.EVENT_ROOM_DISCOVERED, (event_name, roomName) => {
    // console.log('DefenceManager', 'EVENT_ROOM_DISCOVERED', roomName);
    var room = Game.rooms[roomName];
    var room_memory = Memory.rooms[roomName];
    var memory = room_memory.manager_defence = {};

    memory.attack_in_progress = false;

    return true;
});

function DefenceManager(room) {
    this.room = room;
    this.memory = room.memory.manager_defence;
}
DefenceManager.prototype.run = function() {
    var room = this.room;
    var memory = this.memory;

    if (!memory) {
        console.log(Game.time, 'DefenceManager waiting for memory init ...');
        return;
    }
    var hostile_creeps = room.find(FIND_HOSTILE_CREEPS);
    if (hostile_creeps.length || memory.attack_in_progress) {
        if (!memory.attack_in_progress) {
            console.log(Game.time, 'Enemy combatants discovered, initiating defensive actions');
            memory.attack_in_progress = true;
        }
        var hostiles = room.findHostileStructures().concat(hostile_creeps);
        if (!hostiles.length) {
            memory.attack_in_progress = false;
            return;
        }
        var towers = room.findTowers();
        towers.forEach((tower) => {
            var hostile = tower.pos.findClosestHostile();
            if (hostile) {
                // console.log(Game.time, tower, '=>', hostile);
                var attack_ret_val = tower.attack(hostile);
                if ([OK, ERR_NOT_ENOUGH_ENERGY].indexOf(attack_ret_val) == -1) {
                    console.log(Game.time, 'ERROR ERROR ERROR ERROR ERROR', 'Unexpected tower attack_ret_val', attack_ret_val);
                }
            }
        });
    } else if (memory.attack_in_progress) {
        console.log(Game.time, 'Enemy combatants destroyed, disabling defensive actions');
        memory.attack_in_progress = false;
    }

}

module.exports = DefenceManager;
