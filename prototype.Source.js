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
    var lane_creeps = creeps
    .filter((creep) => creep.pos.getRangeTo(source) != 1)
    .sort((creep_a, creep_b) => creep_a.pos.getRangeTo(source) - creep_b.pos.getRangeTo(source));
    console.log('source', source, 'current_harvesters', current_harvesters);
    console.log('source', source, 'lane_creeps', lane_creeps);

    var lanes = Array(this.clearance).fill(null).map(() => []);
    var lane_idx = 0;

    for (var creep of current_harvesters.concat(lane_creeps)) {
        lanes[lane_idx].push(creep);
        lane_idx = (lane_idx + 1) % lanes.length;
    }

    console.log('lane_idx', lane_idx, 'lane', lanes[lane_idx]);
    var wait_time = 0;
    for (creep of lanes[lane_idx]) {
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
    var lane_creeps = creeps
    .filter((creep) => creep.pos.getRangeTo(source) != 1)
    .sort((creep_a, creep_b) => creep_a.pos.getRangeTo(source) - creep_b.pos.getRangeTo(source));

    var lanes = Array(this.clearance).fill(null).map(() => []);
    var lane_idx = 0;

    for (var creep of current_harvesters.concat(lane_creeps)) {
        lanes[lane_idx].push(creep);
        lane_idx = (lane_idx + 1) % lanes.length;
    }

    var wait_time = 0;
    for (creep of lanes[lane_idx]) {
        wait_time += creep.harvest_time_remaining + 4/*pathing penalty heuristic*/;
    }
    var range = new_creep.pos.getRangeTo(source);

    new_creep.log('source', source);
    console.log('lane_idx', lane_idx, 'current_harvesters', current_harvesters, 'lane_creeps', lane_creeps, 'lane', lanes[lane_idx]);

    return wait_time;
}

// Source.prototype.waitTime2 = function(new_creep) {
//     var source = this;

//     var creeps = this.getCreeps().filter((creep) => creep != new_creep);
//     var current_harvesters = creeps.filter((creep) => creep.pos.getRangeTo(source) == 1)
//     .sort((creep_a, creep_b) => creep_a.harvest_time_remaining - creep_b.harvest_time_remaining);
//     var lane_creeps = creeps
//     .filter((creep) => creep.pos.getRangeTo(source) != 1)
//     .sort((creep_a, creep_b) => creep_a.pos.getRangeTo(source) - creep_b.pos.getRangeTo(source));

//     var lanes = Array(this.clearance).fill(null).map(() => []);
//     var lane_idx = 0;

//     for (var creep of current_harvesters.concat(lane_creeps)) {
//         lanes[lane_idx].push(creep);
//         lane_idx = (lane_idx + 1) % lanes.length;
//     }

//     var average_harvest_time = creep.harvest_time_remaining;
//     var lane_wait_time = 0;
//     for (creep of lanes[lane_idx]) {
//         var range = creep.pos.getRangeTo(source);
//         var creep_end_time = Math.max(lane_wait_time, range) + average_harvest_time;
//         lane_wait_time += creep_end_time;
//     }

//     new_creep.log('source', source);
//     console.log('lane_idx', lane_idx, 'lane_wait_time', lane_wait_time, 'current_harvesters', current_harvesters, 'lane_creeps', lane_creeps, 'lane', lanes[lane_idx]);

//     return lane_wait_time;
// }

// Source.prototype.laneLoad = function(new_creep) {
//     var source = this;

//     var creeps = this.getCreeps().filter((creep) => creep != new_creep);
//     var current_harvesters = creeps.filter((creep) => creep.pos.getRangeTo(source) == 1)
//     .sort((creep_a, creep_b) => creep_a.harvest_time_remaining - creep_b.harvest_time_remaining);
//     var lane_creeps = creeps
//     .filter((creep) => creep.pos.getRangeTo(source) != 1)
//     .sort((creep_a, creep_b) => creep_a.pos.getRangeTo(source) - creep_b.pos.getRangeTo(source));

//     var lanes = Array(this.clearance).fill(null).map(() => []);
//     var lane_idx = 0;

//     for (var creep of current_harvesters.concat(lane_creeps)) {
//         lanes[lane_idx].push(creep);
//         lane_idx = (lane_idx + 1) % lanes.length;
//     }

//     var source_target_range = new_creep.pos.getRangeTo(source);
//     var average_harvest_time = creep.harvest_time_remaining;
//     var creeps_per_lane = 1 + 2 * source_target_range / average_harvest_time;
//     var creeps_on_lane = 0;
//     for (creep of lanes[lane_idx]) {
//         creeps_on_lane += creep.harvest_time_remaining;
//     }
//     creeps_on_lane /= average_harvest_time;

//     new_creep.log('source', source, 'creeps', creeps.length);
//     console.log('lane_idx', lane_idx, 'creeps_on_lane', creeps_on_lane, 'current_harvesters', current_harvesters, 'lane_creeps', lane_creeps, 'lane', lanes[lane_idx]);
//     return creeps_on_lane / creeps_per_lane;
// }

var RANGE_TO_TARGET_WINDOW_SIZE = 10;

Source.prototype.registerCreep = function(new_creep) {
    var new_creep_range = new_creep.pos.getRangeTo(this);
    var prev_range_to_target_mean = this.memory.range_to_target_mean * RANGE_TO_TARGET_WINDOW_SIZE;
    if (!prev_range_to_target_mean) {
        prev_range_to_target_mean = new_creep_range * RANGE_TO_TARGET_WINDOW_SIZE;
    }
    var range_to_target_mean =
      this.memory.range_to_target_mean =
        (prev_range_to_target_mean + new_creep_range - prev_range_to_target_mean / RANGE_TO_TARGET_WINDOW_SIZE) / RANGE_TO_TARGET_WINDOW_SIZE;
    // console.log(this, 'range_to_target_mean', range_to_target_mean);
}

Source.prototype.laneLoad2 = function(new_creep) {
    var source = this;

    var new_creep_range = new_creep.pos.getRangeTo(source);
    var range_to_target_mean = this.memory.range_to_target_mean;
    if (!range_to_target_mean) {
        range_to_target_mean = new_creep_range;
    }

    range_to_target_mean += 1; // Bad pathing heuristic
    var average_harvest_time = new_creep.harvest_time_remaining;
    var creeps_per_lane = 1 + 2 * range_to_target_mean / average_harvest_time;
    var max_creeps = this.clearance * creeps_per_lane;
    var creeps = this.getCreeps().filter((creep) => creep != new_creep);
    var load = (creeps.length + 1) / max_creeps;

    // new_creep.log(source, 'range_to_target_mean', range_to_target_mean, 'creeps_per_lane', creeps_per_lane, 'max_creeps', max_creeps, 'creeps', creeps.length, 'load', load);

    return load;
}

//TODO: make cached property
Source.prototype.maxCreeps = function() {
    var source = this;

    var range_to_target_mean = this.memory.range_to_target_mean;
    if (!range_to_target_mean) {
        return 2 * this.clearance; // heuristic
    }

    range_to_target_mean += 1; // Bad pathing heuristic
    // TODO: store average harvest time from register creep
    var average_harvest_time = 25;
    var creeps_per_lane = 1 + 2 * range_to_target_mean / average_harvest_time;
    var max_creeps = this.clearance * creeps_per_lane;
    return Math.ceil(max_creeps);
}
