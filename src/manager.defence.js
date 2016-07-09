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

    let towers = room.findTowers();
    if (!towers) {
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
        var hostiles = room.findHostileStructures().concat(hostile_creeps);
        if (!hostiles.length) {
            console.log(Game.time, 'Enemy combatants destroyed, disabling defensive actions');
            this.room_memory.attack_in_progress = false;
            return;
        }
        for (let tower of towers) {
            // var hostile = tower.pos.findClosestHostile();
            var hostile = hostiles[0];
            // console.log(Game.time, tower, '=>', hostile);
            var attack_ret_val = tower.attack(hostile);
            if ([OK, ERR_NOT_ENOUGH_ENERGY].indexOf(attack_ret_val) == -1) {
                console.log(Game.time, 'ERROR ERROR ERROR ERROR ERROR', 'Unexpected tower attack_ret_val', attack_ret_val);
            }
        }
    } else {
        // rampart looses 3 hits per tick
        // tower repairs 150 per tick (worst case)
        if (Game.time % 5 != 0) { // Slow Repair
            return;
        }
        if (Game.time % 50 == 0 || (this.repair_target && this.repair_target.hits == this.repair_target.hitsMax)) {
            let ramparts = room.find(FIND_MY_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_RAMPART && structure.hits < structure.hitsMax});
            this.repair_target = Array.prototype.findSortedFirst.call(ramparts, (a,b) => a.hits - b.hits);
        }
        if (!this.repair_target) {
            this.repair_target = null;
            return;
        }
        for (let tower of towers) {
            if (tower.energy > 0.9 * tower.energyCapacity) {
                tower.repair(this.repair_target);
            }
            
        }
    }

}

Object.defineProperty(DefenceManager.prototype, "repair_target_id", {
    get: function () {
        if (this._repair_target_id === undefined) {
            this._repair_target_id = this.memory.repair_target;
            if (this._repair_target_id === undefined) {
                this._repair_target_id = null;
            }
        }
        return this._repair_target_id;
    },
    set: function (repair_target_id) {
        this.memory.repair_target = this._repair_target_id = repair_target_id;
    }
});

Object.defineProperty(DefenceManager.prototype, "repair_target", {
    get: function () {
        if (this._repair_target_object === undefined) {
            if (this.repair_target_id) {
                this._repair_target_object = Game.getObjectById(this.repair_target_id);
            } else {
                this._repair_target_object = null;
            }
        }
        return this._repair_target_object;
    },
    set: function (repair_target_object) {
        this._repair_target_object = repair_target_object;
        this.repair_target_id = repair_target_object ? repair_target_object.id : null;
    }
});

module.exports = DefenceManager;
