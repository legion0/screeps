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
        var source = this;
        var creeps = this.room
        .find(FIND_MY_CREEPS, {filter: (creep) => creep.source == source});
        
        // 
        var load = 0;
        var 



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

Source.prototype.calculateLoad = function(new_creep) {
    var source = this;
    var creeps = this.room.find(FIND_MY_CREEPS, {filter: (creep) => creep.source == source && creep != new_creep});
    creeps.append(new_creep);
    var load = 0;
    for (var creep of creeps) {
        load += creep.getRangeTo(source) - 1 + creep.harvest_time_remaining;
    }
    return load;
}

Source.prototype.estimateCreepLoad = function(creep) {
    var distance = creep.pos.getRangeTo(this);
    var distance_factor = Math.sqrt(1 - distance / 50) / 2 + 0.5;
    return distance_factor / this.clearance;
}