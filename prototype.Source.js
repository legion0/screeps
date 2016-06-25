var CONSTANTS = require('constants');
var events = require('events');

var RANGE_TO_TARGET_WINDOW_SIZE = 10;

events.listen(CONSTANTS.EVENT_TICK_START, (event_name) => {
    // console.log('Source', 'EVENT_TICK_START', event_name);
    for (var roomName in Game.rooms) {
        Game.rooms[roomName].findSources().forEach((source) => {

            source._updateDrain();

            source.memoryShort.current_harvesters = 0;
            source.memoryShort.current_harvesters_time = 0;
            source.memoryShort.enroute_harvesters = 0;
            source.memoryShort.enroute_harvesters_distance = 0;
        });
    }
    // console.log('Source', 'EVENT_TICK_START', event_name, 'END');
    return true;
});

Source.prototype.getCreeps = function() {
    var source = this;
    return this.room.find(FIND_MY_CREEPS, {filter: (creep) => creep.source == source});
}

Source.prototype.laneLoad = function(new_creep) {
    var creeps = this.getCreeps().filter((creep) => creep != new_creep);
    var load = (creeps.length + 1) / this.max_creeps;

    // new_creep.log(source, 'range_to_target_mean', range_to_target_mean, 'creeps_per_lane', creeps_per_lane, 'max_creeps', max_creeps, 'creeps', creeps.length, 'load', load);

    return load;
}

//TODO: make cached property
Object.defineProperty(Source.prototype, "max_creeps", {
    get: function() {
        if (this._max_creeps === undefined) {
            let source = this;

            //TODO: limit max creeps based on drain estimate till depletion
            // TODO: store average harvest time from register creep
            let average_harvest_time = 25;
            let creeps_per_lane = 1 + 2 * this._distance_to_sink / average_harvest_time;
            let max_creeps = this.clearance * creeps_per_lane;
            max_creeps = Math.min(max_creeps, 2 * this.clearance);
            this._max_creeps = max_creeps;
            // console.log(this, 'max_creeps', max_creeps);
            this._max_creeps = Math.ceil(this._max_creeps);
        }
        return this._max_creeps;
    }
});

Source.prototype._updateDrain = function() {
    var current_energy = this.energy;
    var prev_energy = this.memory.energy;
    if (prev_energy === undefined) {
        prev_energy = current_energy;
    }
    this.memory.energy = current_energy;

    if (this.ticksToRegeneration !== undefined) {
        this.memory.drain = prev_energy - current_energy;
    } else {
        this.memory.drain = 0;
    }
}

Object.defineProperty(Source.prototype, "drain", {
    get: function () {
        // console.log(this, 'drain', this.memory.drain);
        var drain = this.memory.drain;
        if (drain === undefined) {
            drain = 0;
        }
        return drain;
    }
});

Object.defineProperty(Source.prototype, "_distance_to_sink", {
    get: function () {
        if (this.__distance_to_sink === undefined) {
            var source = this;
            var containers = this.pos
            .findInRange(FIND_STRUCTURES, 10, {filter: (structure) => structure.structureType == STRUCTURE_CONTAINER})
            .sort((a,b) => a.pos.getRangeTo(source) - b.pos.getRangeTo(source));
            if (containers.length) {
                this.__distance_to_sink = containers[0].pos.getRangeTo(source);
            } else {
                this.__distance_to_sink = 10;
            }

        }
        return this.__distance_to_sink;
    }
});
