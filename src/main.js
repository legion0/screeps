require('js.prototype.Array');

require('prototype.Room');

require('prototype.RoomPosition');

require('prototype.RoomObject');
require('prototype.Structure');
require('prototype.ConstructionSite');
require('prototype.Source');
require('prototype.StructureSpawn');
require('prototype.Creep');
require('prototype.Flag');

require('FlagPath');

var CONSTANTS = require('constants');
var events = require('events');

var WorkforceManager = require('manager.workforce');
var DefenceManager = require('manager.defence');
var AttackManager = require('manager.Attack');

let CPU_EMA_ALPHA = 2 / (100 + 1);

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
    let range = creep.pos.getRangeTo(flag);
    if (range != 0) {
        creep.moveTo(flag);
    }
    if (creep.room != flag.room) {
        return;
    }

    let enemy_creeps = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 1);
    if (enemy_creeps.length) {
        creep.attack(enemy_creeps[0]);
        return;
    }

    let structures = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, 1);
    if (structures.length) {
        creep.attack(structures[0]);
        return;
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

        let prev_cpu_ema = Memory.cpu_ema;
        if (prev_cpu_ema === undefined) {
            prev_cpu_ema = 0;
        }
        let new_cpu_ema = Memory.cpu_ema = CPU_EMA_ALPHA * Game.cpu.getUsed() + (1-CPU_EMA_ALPHA) * prev_cpu_ema;
        if (Game.time % 10 == 0) {
            console.log(Game.time, 'new_cpu_ema', new_cpu_ema);
        }

    } catch (e) {
        console.log(Game.time, 'EXCEPTION', e, e.stack);
    }
}