var CONSTANTS = require('constants');
var events = require('events');

events.listen(CONSTANTS.EVENT_TICK_START, (event_name) => {
    // console.log('Source', 'EVENT_TICK_START', event_name);
    for (var roomName in Game.rooms) {
        Game.rooms[roomName].findSources().forEach((source) => {
            source.memoryShort.current_harvesters = 0;
            source.memoryShort.current_harvesters_time = 0;
            source.memoryShort.enroute_harvesters = 0;
            source.memoryShort.enroute_harvesters_distance = 0;
        });
    }
    // console.log('Source', 'EVENT_TICK_START', event_name, 'END');
    return true;
});

Object.defineProperty(Source.prototype, "load", {
    get: function() {
        var memoryShortPrev = this.memoryShortPrev;
        var current_harvesters = memoryShortPrev.current_harvesters;
        var enroute_harvesters = memoryShortPrev.enroute_harvesters;
        var enroute_harvesters_distance = memoryShortPrev.enroute_harvesters_distance;
        var current_harvesters_time = memoryShortPrev.current_harvesters_time;
        
        var enroute_harvesters_load = 0;
        if (enroute_harvesters != 0) {
            var average_distance = enroute_harvesters_distance / enroute_harvesters;
            var distance_factor = Math.sqrt(1 - average_distance / 50) / 2 + 0.5;
            var enroute_harvesters_load = distance_factor * enroute_harvesters;
        }
        return (current_harvesters + enroute_harvesters_load) / this.clearance;
    }
});
Source.prototype.registerCreep = function(creep, old_source) {
    var distance = creep.pos.getRangeTo(this);
    if (old_source && old_source.id != this.id) {
        old_source.creeps.delete(creep);
        old_source.creeps = old_source.creeps;
        //  = old_source.creeps.filter((source_creep) => source_creep.id != creep.id);
        old_source.memoryShortPrev.enroute_harvesters -= 1;
        old_source.memoryShortPrev.enroute_harvesters_distance -= creep.pos.getRangeTo(old_source);
        this.memoryShortPrev.enroute_harvesters += 1;
        this.memoryShortPrev.enroute_harvesters_distance += distance;
    }
    this.creeps.add(creep);
    this.creeps = this.creeps;
    if (distance == 1) {
        this.memoryShort.current_harvesters += 1;
        this.memoryShort.current_harvesters_time += creep.harvest_time_remaining;
    } else {
        this.memoryShort.enroute_harvesters += 1;
        this.memoryShort.enroute_harvesters_distance += distance;
    }
}

Source.prototype.unregisterCreep = function(creep) {
    this.creeps.delete(creep);
    this.creeps = this.creeps;
}

Source.prototype.estimateCreepLoad = function(creep) {
    var distance = creep.pos.getRangeTo(this);
    var distance_factor = Math.sqrt(1 - distance / 50) / 2 + 0.5;
    return distance_factor / this.clearance;
}