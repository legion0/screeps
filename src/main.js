require('js.prototype.Array');

require('prototype.Room');

require('prototype.RoomPosition');

require('prototype.RoomObject');
require('prototype.Structure');
require('prototype.ConstructionSite');
require('prototype.Source');
require('prototype.StructureSpawn');
require('prototype.Creep');

var CONSTANTS = require('constants');
var events = require('events');

var WorkforceManager = require('manager.workforce');
var DefenceManager = require('manager.defence');
var AttackManager = require('manager.Attack');

function attack_flag() {

    let flag = Game.flags.attack;
    if (!flag) {
        return;
    }
    if (!Game.creeps.a) {
        Game.spawns.Spawn1.createCreep([MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK, MOVE, ATTACK], 'a');
        return;
    }

    let creep = Game.creeps.a;
    if (creep.pos.getRangeTo(flag) != 0) {
        creep.moveTo(flag);
    } else {
        let structure = creep.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES);
        if (structure && structure.pos.getRangeTo(creep) <= 1) {
            creep.attack(structure);
        } else {
            let enemy_creeps = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
            creep.attack(enemy_creeps);
            
        }
    }
}

module.exports.loop = function () {
    PathFinder.use(true);
    try {
        attack_flag();

        if (Game.time % 10 == 0) {
            // console.log(Game.time, 'Checking for new rooms.');
            for (var roomName in Game.rooms) {
                var room = Game.rooms[roomName];
                // console.log(Game.time, 'room.energy', room.energy_available, '/', room.energy_capacity, 'room.drain', room.memory.drain_mean / 128);
                var memory = Memory.rooms[roomName];
                if (!memory) {
                    memory = Memory.rooms[roomName] = {};
                }
                if (!memory.discovered) {
                    memory.discovered = true;
                    events.fire(CONSTANTS.EVENT_ROOM_DISCOVERED, roomName);
                }
            }
        }
        events.fire(CONSTANTS.EVENT_TICK_START);

        for (var roomName in Game.rooms) {
            var room = Game.rooms[roomName];
            if (!room.memory.discovered) {
                continue;
            }
            // console.log('Source load before');
            // room.findSources().forEach((source) => {
            //     console.log(source, 'load', source.load);
            // });
            new DefenceManager(room).run();
            new WorkforceManager(room).run();
            // console.log('Source load after');
            // room.findSources().forEach((source) => {
            //     console.log(source, 'load', source.load);
            // });
        }
        new AttackManager().run();

        events.fire(CONSTANTS.EVENT_TICK_END);

        // let cpu_usage = 1.0 * Game.cpu.getUsed() / Game.cpu.limit;
        // if (cpu_usage > 0.3) {
        //     console.log(Game.time, 'High CPU Usage', cpu_usage, Game.cpu.getUsed(), '/', Game.cpu.limit, Game.cpu.tickLimit, Game.cpu.bucket);
        // }
    } catch (e) {
        console.log(Game.time, 'EXCEPTION', e, e.stack);
    }
}