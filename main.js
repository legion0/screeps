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

module.exports.loop = function () {
    try {
        if (Game.time % 10 == 0) {
            // console.log(Game.time, 'Checking for new rooms.');
            for (var roomName in Game.rooms) {
                var room = Game.rooms[roomName];
                console.log(Game.time, 'room.energy', room.energy_available, '/', room.energy_capacity, 'room.drain', room.energy_drain);
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

        events.fire(CONSTANTS.EVENT_TICK_END);

        let cpu_usage = 1.0 * Game.cpu.getUsed() / Game.cpu.limit;
        if (cpu_usage > 0.3) {
            console.log(Game.time, 'High CPU Usage', cpu_usage);
        }
    } catch (e) {
        console.log(Game.time, 'ERROR', e);
    }
}