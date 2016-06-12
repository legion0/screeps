var CONSTANTS = require('constants');
var events = require('events');

Object.defineProperty(RoomObject.prototype, "memory", {
    get: function () {
        var room_objects_memory = Memory.rooms[this.room.name].room_objects;
        if (!room_objects_memory) {
            room_objects_memory = Memory.rooms[this.room.name].room_objects = {};
        }
        var memory = room_objects_memory[this.id];
        if (!memory) {
            memory = room_objects_memory[this.id] = {};
        }
        return memory;
    }
});

events.listen(CONSTANTS.EVENT_ROOM_DISCOVERED, (event_name, roomName) => {
    // console.log('RoomObject', 'EVENT_ROOM_DISCOVERED', event_name, roomName);
    Memory.rooms[roomName].room_objects_short_memory = {};
    return true;
});
events.listen(CONSTANTS.EVENT_TICK_START, (event_name) => {
    // console.log('RoomObject', 'EVENT_TICK_START');
    var oldest_memory_time = Game.time - 2
    for (var roomName in Game.rooms) {
        var room_objects_short_memory = Memory.rooms[roomName].room_objects_short_memory;
        room_objects_short_memory[Game.time] = {};
        if (oldest_memory_time in room_objects_short_memory) {
            delete room_objects_short_memory[oldest_memory_time];
        }
        if (Game.time % 100 == 0) {
            for (var time in room_objects_short_memory) {
                if (time < oldest_memory_time) {
                    delete room_objects_short_memory[time];
                }
            }
        }
    }
    // console.log('RoomObject', 'EVENT_TICK_START', 'END');
    return true;
});

Object.defineProperty(RoomObject.prototype, "memoryShort", {
    get: function () {
        var time_memory = Memory.rooms[this.room.name].room_objects_short_memory[Game.time];
        // console.log('RoomObject.memoryShort', 'time_memory', time_memory);
        var room_object_short_memory = time_memory[this.id];
        if (!room_object_short_memory) {
            room_object_short_memory = time_memory[this.id] = {};
        }
        return room_object_short_memory;
    }
});
Object.defineProperty(RoomObject.prototype, "memoryShortPrev", {
    get: function () {
        var time_memory = Memory.rooms[this.room.name].room_objects_short_memory[Game.time - 1];
        var room_object_short_memory = time_memory[this.id];
        if (!room_object_short_memory) {
            room_object_short_memory = time_memory[this.id] = {};
        }
        return room_object_short_memory;
    }
});
