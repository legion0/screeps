var CONSTANTS = require('constants');
var events = require('events');


var ENERGY_DRAIN_EMA_GROWTH_RATE = 0.99;
var ENERGY_DRAIN_EMA_DECAY_RATE = 0.01;
var ENERGY_DRAIN_REPORT_CHANGE_THRESHOLD = 0.05;
var ENERGY_DRAIN_WINDOW_SIZE = 128;

events.listen(CONSTANTS.EVENT_ROOM_DISCOVERED, (event_name, roomName) => {
    // console.log('Room', 'EVENT_ROOM_DISCOVERED', roomName);
    var memory = Memory.rooms[roomName];
    memory.energy_drain_ema = 0;
    memory.energy_drain_report = 0;
    memory.energy_available = 0;
    // console.log('Room', 'EVENT_ROOM_DISCOVERED', roomName), 'END';
    return true;
});
events.listen(CONSTANTS.EVENT_TICK_START, (event_name) => {
    // console.log('Room', 'EVENT_TICK_START');

    for (var roomName in Game.rooms) {
        var room = Game.rooms[roomName];

        var drain = room.memory.energy_available - room.energy_available;
        var prev_energy_drain_ema = room.memory.energy_drain_ema;
        // var alpha = drain > room.memory.energy_drain_ema ? ENERGY_DRAIN_EMA_GROWTH_RATE : ENERGY_DRAIN_EMA_DECAY_RATE;
        // var energy_drain_ema = room.memory.energy_drain_ema = alpha * drain + (1-alpha) * room.memory.energy_drain_ema;
        var energy_drain_ema = room.memory.energy_drain_ema = prev_energy_drain_ema + drain - prev_energy_drain_ema / ENERGY_DRAIN_WINDOW_SIZE;

        var prev_report = room.memory.energy_drain_report;
        // console.log(energy_drain_ema, Math.abs(energy_drain_ema - prev_report), ENERGY_DRAIN_REPORT_CHANGE_THRESHOLD * prev_report);
        if (Math.abs(energy_drain_ema - prev_report) > ENERGY_DRAIN_REPORT_CHANGE_THRESHOLD * Math.abs(prev_report)) {
            room.memory.energy_drain_report = Math.ceil(energy_drain_ema / ENERGY_DRAIN_WINDOW_SIZE);
        }

        room.memory.energy_drain_ema = energy_drain_ema;
        room.memory.energy_available = room.energy_available;
    }

    // console.log('Room', 'EVENT_TICK_START', 'END');
    return true;
});

Object.defineProperty(Room.prototype, "energy_drain", {
    get: function() {
        return this.memory.energy_drain_report;
    }
});
Object.defineProperty(Room.prototype, "energy_capacity", {
    get: function() {
        if (this._energy_capacity === undefined) {
            var energy_capacity = this.energyCapacityAvailable;
            this.find(FIND_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_CONTAINER}).forEach((container) => {
                // TODO: ignore other resources
                energy_capacity += container.storeCapacity;
            });
            this._energy_capacity = energy_capacity;
        }
        return this._energy_capacity;
    }
});
Object.defineProperty(Room.prototype, "energy_available", {
    get: function() {
        if (this._energy_available === undefined) {
            var energy_available = this.energyAvailable;
            this.find(FIND_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_CONTAINER}).forEach((container) => {
                // TODO: ignore other resources
                energy_available += container.store[RESOURCE_ENERGY];
            });
            this._energy_available = energy_available;
        }
        return this._energy_available;
    }
});

Room.prototype.findMyExtensions = function() {
    return this.find(FIND_MY_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_EXTENSION});
};

Room.prototype.findKeeperLairs = function() {
    return this.find(FIND_HOSTILE_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_KEEPER_LAIR});
};

Room.prototype.findSources = function() {
    return this.find(FIND_SOURCES).filter((source) => {
        return source.id != this.memory.lair_source_id;
    });
};

Room.prototype.findSourcesActive = function(ignore_source_id) {
    return this.find(FIND_SOURCES_ACTIVE).filter((source) => {
        return source.id != this.memory.lair_source_id && source.id != ignore_source_id;
    });
};

Room.prototype.findTowers = function() {
    return this.find(FIND_MY_STRUCTURES, {filter: (structure) => structure.structureType === STRUCTURE_TOWER});
};

Room.prototype.findContainers = function() {
    return this.find(FIND_STRUCTURES, {filter: (structure) => structure.structureType === STRUCTURE_CONTAINER});
};

Room.prototype.findHostileStructures = function() {
    return this.find(FIND_HOSTILE_CONSTRUCTION_SITES)
        .concat(this.find(FIND_HOSTILE_STRUCTURES))
        .concat(this.find(FIND_HOSTILE_SPAWNS))
        .filter((hostile) => hostile.structureType != STRUCTURE_KEEPER_LAIR);
};
