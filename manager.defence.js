// var CONSTANTS = require('constants');
// var events = require('events');

function DefenceManager(room) {
    this.room = room;
    this.room_memory = room.memory;
    this.memory = room.memory.manager_defence;
    if (!this.memory) {
        this.memory = room.memory.manager_defence = {};
    }
    if (this.room_memory.attack_in_progress === undefined) {
        this.room_memory.attack_in_progress = false;
    }
}
DefenceManager.prototype.run = function() {
    var room = this.room;
    var memory = this.memory;

    if (!memory) {
        console.log(Game.time, 'DefenceManager waiting for memory init ...');
        return;
    }
    var hostile_creeps = room.find(FIND_HOSTILE_CREEPS);
    if (hostile_creeps.length) {
        if (!this.room_memory.attack_in_progress) {
            console.log(Game.time, 'Enemy combatants discovered, initiating defensive actions');
            this.room_memory.attack_in_progress = true;
        }
    }
    if (this.room_memory.attack_in_progress) {
        if (!this.room_memory.attack_in_progress) {
            this.room_memory.attack_in_progress = true;
        }
        var hostiles = room.findHostileStructures().concat(hostile_creeps);
        if (!hostiles.length) {
            console.log(Game.time, 'Enemy combatants destroyed, disabling defensive actions');
            this.room_memory.attack_in_progress = false;
            return;
        }
        var towers = room.findTowers();
        towers.forEach((tower) => {
            // var hostile = tower.pos.findClosestHostile();
            var hostile = hostiles[0];
            // console.log(Game.time, tower, '=>', hostile);
            var attack_ret_val = tower.attack(hostile);
            if ([OK, ERR_NOT_ENOUGH_ENERGY].indexOf(attack_ret_val) == -1) {
                console.log(Game.time, 'ERROR ERROR ERROR ERROR ERROR', 'Unexpected tower attack_ret_val', attack_ret_val);
            }
        });
    }

}

module.exports = DefenceManager;
