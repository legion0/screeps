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

// Object.defineProperty(Source.prototype, "load", {
//     get: function() {
//         var source = this;
//         var creeps = this.room
//         .find(FIND_MY_CREEPS, {filter: (creep) => creep.source == source});
        
//         // 
//         var load = 0;



//         var memoryShortPrev = this.memoryShortPrev;
//         var current_harvesters = memoryShortPrev.current_harvesters;
//         var enroute_harvesters = memoryShortPrev.enroute_harvesters;
//         var enroute_harvesters_distance = memoryShortPrev.enroute_harvesters_distance;
//         var current_harvesters_time = memoryShortPrev.current_harvesters_time;
        
//         var enroute_harvesters_load = 0;
//         if (enroute_harvesters != 0) {
//             var average_distance = enroute_harvesters_distance / enroute_harvesters;
//             var distance_factor = Math.sqrt(1 - average_distance / 50) / 2 + 0.5;
//             var enroute_harvesters_load = distance_factor * enroute_harvesters;
//         }
//         return (current_harvesters + enroute_harvesters_load) / this.clearance;
//     }
// });

Source.prototype.calculateLoad = function(new_creep) {
    var source = this;

    var creeps = this.getCreeps().filter((creep) => creep != new_creep);
    var current_harvesters = creeps.filter((creep) => creep.pos.getRangeTo(source) == 1)
    .sort((creep_a, creep_b) => creep_a.harvest_time_remaining - creep_b.harvest_time_remaining);
    var line_creeps = creeps
    .filter((creep) => creep.pos.getRangeTo(source) != 1)
    .sort((creep_a, creep_b) => creep_a.pos.getRangeTo(source) - creep_b.pos.getRangeTo(source));
    console.log('source', source, 'current_harvesters', current_harvesters);
    console.log('source', source, 'line_creeps', line_creeps);

    var lines = Array(this.clearance).fill(null).map(() => []);
    var line_idx = 0;

    for (var creep of current_harvesters.concat(line_creeps)) {
        lines[line_idx].push(creep);
        line_idx = (line_idx + 1) % lines.length;
    }

    console.log('line_idx', line_idx, 'line', lines[line_idx]);
    var wait_time = 0;
    for (creep of lines[line_idx]) {
        wait_time += creep.harvest_time_remaining;
    }
    var range = new_creep.pos.getRangeTo(source);
    return Math.max(range, wait_time);
}

// Source.prototype.calculateLoad = function(new_creep) {
//     var source = this;

//     function creepLoad(creep, source) {
//         return creep.pos.getRangeTo(source) - 1 + creep.harvest_time_remaining;
//     }

//     var load = creepLoad(new_creep, source);
//     var creeps = this.room.find(FIND_MY_CREEPS, {filter: (creep) => creep.source == source && creep != new_creep});
//     if (creeps.length < this.clearance) {
//         return load;
//     }
//     for (var creep of creeps) {
//         load += creepLoad(creep, source);
//     }
//     return load / this.clearance;
// }

// Source.prototype.estimateCreepLoad = function(creep) {
//     var distance = creep.pos.getRangeTo(this);
//     var distance_factor = Math.sqrt(1 - distance / 50) / 2 + 0.5;
//     return distance_factor / this.clearance;
// }

Source.prototype.getCreeps = function() {
    var source = this;
    return this.room.find(FIND_MY_CREEPS, {filter: (creep) => creep.source == source});
}

Source.prototype.waitTime = function(new_creep) {
    var source = this;

    var creeps = this.getCreeps().filter((creep) => creep != new_creep);
    var current_harvesters = creeps.filter((creep) => creep.pos.getRangeTo(source) == 1)
    .sort((creep_a, creep_b) => creep_a.harvest_time_remaining - creep_b.harvest_time_remaining);
    var line_creeps = creeps
    .filter((creep) => creep.pos.getRangeTo(source) != 1)
    .sort((creep_a, creep_b) => creep_a.pos.getRangeTo(source) - creep_b.pos.getRangeTo(source));
    console.log('source', source, 'current_harvesters', current_harvesters);
    console.log('source', source, 'line_creeps', line_creeps);

    var lines = Array(this.clearance).fill(null).map(() => []);
    var line_idx = 0;

    for (var creep of current_harvesters.concat(line_creeps)) {
        lines[line_idx].push(creep);
        line_idx = (line_idx + 1) % lines.length;
    }

    console.log('line_idx', line_idx, 'line', lines[line_idx]);
    var wait_time = 0;
    for (creep of lines[line_idx]) {
        wait_time += creep.harvest_time_remaining;
    }
    var range = new_creep.pos.getRangeTo(source);
    return wait_time;
}
