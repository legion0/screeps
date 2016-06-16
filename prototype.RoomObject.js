var CONSTANTS = require('constants');
var events = require('events');

Object.defineProperty(RoomObject.prototype, "memory", {
    get: function () {
        var room_objects_memory = Memory.rooms[this.room.name].room_objects;
        // console.log('this.room.name', this.room.name, 'room_objects_memory', room_objects_memory);
        var memory = room_objects_memory[this.id];
        if (!memory) {
            memory = room_objects_memory[this.id] = {};
        }
        return memory;
    }
});

events.listen(CONSTANTS.EVENT_ROOM_DISCOVERED, (event_name, roomName) => {
    // console.log('RoomObject', 'EVENT_ROOM_DISCOVERED', event_name, roomName);
    var memory = Memory.rooms[roomName];
    memory.room_objects = {};
    memory.room_objects_short_memory = {};
    return true;
});
events.listen(CONSTANTS.EVENT_TICK_START, (event_name) => {
    // console.log('RoomObject', 'EVENT_TICK_START');
    var oldest_memory_time = Game.time - 10;
    for (var roomName in Game.rooms) {
        var room_objects_short_memory = Memory.rooms[roomName].room_objects_short_memory;
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
        var short_memory = Memory.rooms[this.room.name].room_objects_short_memory;
        var time_memory = short_memory[Game.time];
        if (time_memory === undefined) {
            time_memory = short_memory[Game.time] = {};
        }
        var room_object_short_memory = time_memory[this.id];
        if (!room_object_short_memory) {
            room_object_short_memory = time_memory[this.id] = {};
        }
        return room_object_short_memory;
    }
});
Object.defineProperty(RoomObject.prototype, "memoryShortPrev", {
    get: function () {
        var short_memory = Memory.rooms[this.room.name].room_objects_short_memory;
        var time_memory = short_memory[Game.time - 1];
        if (time_memory === undefined) {
            time_memory = short_memory[Game.time - 1] = {};
        }
        var room_object_short_memory = time_memory[this.id];
        if (!room_object_short_memory) {
            room_object_short_memory = time_memory[this.id] = {};
        }
        return room_object_short_memory;
    }
});

Object.defineProperty(RoomObject.prototype, "clearance", {
    get: function () {
        if (this._clearance === undefined) {
            // console.log('Fetching clearance');
            var clearance = this.memory.clearance;
            if (clearance === undefined) {
                // console.log('Calculating clearance');
                clearance = 0;
                var room = this.room;
                var x = this.pos.x;
                var y = this.pos.y;
                for (var i = x - 1; i != x + 2; ++i) {
                    for (var j = y - 1; j != y + 2; ++j) {
                        if (i == x && j == y) {
                            continue;
                        }
                        var look_res = room.lookForAt(LOOK_TERRAIN, i, j);
                        if (look_res.length && look_res[0] == 'plain') {
                            ++clearance;
                        }
                    }
                }
                this.memory.clearance = clearance;
            }
            this._clearance = clearance;
        }
        return this._clearance;
    }
});

Object.defineProperty(RoomObject.prototype, "creeps", {
    get: function () {
        if (this._creeps === undefined) {
            this._creeps = this.memory.creeps;
            if (this._creeps === undefined) {
                this._creeps = [];
            }
            this._creeps = new Set(this._creeps.map((id) => Game.getObjectById(id)).filter((creep) => creep != null));
        }
        return this._creeps;
    },
    set: function (creeps) {
        this._creeps = creeps;
        this.memory.creeps = Array.from(creeps).map((creep) => creep.id);
    }
});
