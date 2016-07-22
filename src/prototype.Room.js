var CONSTANTS = require('constants');
var events = require('events');

var Pathing = require('Pathing');


// var ENERGY_DRAIN_EMA_GROWTH_RATE = 0.99;
// var ENERGY_DRAIN_EMA_DECAY_RATE = 0.01;
// var ENERGY_DRAIN_REPORT_CHANGE_THRESHOLD = 0.05;

var ENERGY_DRAIN_WINDOW_SIZE = 128;

// events.listen(CONSTANTS.EVENT_TICK_START, (event_name) => {
//     // console.log('Room', 'EVENT_TICK_START');

//     for (var roomName in Game.rooms) {
//         var room = Game.rooms[roomName];
//         room._updateEnergyDrain();
//     }

//     // console.log('Room', 'EVENT_TICK_START', 'END');
//     return true;
// });

Object.defineProperty(Room.prototype, "energy_drain", {
    get: function() {
        var drain = this.memory.energy_drain_report;
        if (drain === undefined) {
            drain = this.memory.energy_drain_report = 0;
        }
        return drain;
    }
});
//TODO: Make cached property
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
//TODO: Make cached property
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

Room.prototype.findContainers = function() {
    return this.find(FIND_STRUCTURES, {filter: s => s.structureType == STRUCTURE_CONTAINER});
}

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

Room.prototype._updateEnergyDrain = function() {
    this._updateInternalDrain();

    var current_drain = this._internal_drain;
    current_drain += this.findSources().reduce((drain, source) => drain + source.drain, 0);
    // console.log(Game.time, 'current_drain', current_drain);

    var drain_mean = this.memory.drain_mean;
    if (drain_mean === undefined) {
        drain_mean = this.memory.drain_mean = 0;
    }

    var drain_max = this.memory.drain_max;
    if (drain_max === undefined) {
        drain_max = this.memory.drain_max = 0;
    }
    var drain_max_last_update_time = this.memory.drain_max_last_update_time;
    if (drain_max_last_update_time === undefined) {
        drain_max_last_update_time = this.memory.drain_max_last_update_time = 0;
    }

    var new_drain_mean = this.memory.drain_mean = drain_mean + current_drain - drain_mean / ENERGY_DRAIN_WINDOW_SIZE;
    if (new_drain_mean < 0 && new_drain_mean < drain_max || new_drain_mean > 0 && new_drain_mean > drain_max || (Game.time - drain_max_last_update_time) > ENERGY_DRAIN_WINDOW_SIZE) {
        drain_max = this.memory.drain_max = new_drain_mean;
        this.memory.energy_drain_report = new_drain_mean / ENERGY_DRAIN_WINDOW_SIZE;
        this.memory.drain_max_last_update_time = Game.time;
    }
}

Room.prototype._updateInternalDrain = function() {
    var current_energy = this.energy_available;
    var prev_energy = this.memory.energy_available;
    if (prev_energy === undefined) {
        prev_energy = current_energy;
    }
    this.memory.energy_available = current_energy;

    this.memory.internal_drain = prev_energy - current_energy;
}

Object.defineProperty(Room.prototype, "_internal_drain", {
    get: function () {
        // console.log(this, 'internal_drain', this.memory.internal_drain);
        var drain = this.memory.internal_drain;
        if (drain === undefined) {
            drain = 0;
        }
        return drain;
    }
});


Room.prototype.truncate_body = function(all_body_parts, opt_max_price) {
    let max_price = opt_max_price ? opt_max_price : this.energyCapacityAvailable;
    var price = 0;
    let i = 0;
    for (let body_part of all_body_parts) {
        if (price + BODYPART_COST[body_part] <= max_price) {
            price += BODYPART_COST[body_part];
            ++i;
            continue;
        }
        break;
    }
    return all_body_parts.slice(0, i);
}

Room.prototype.build_road = function(from, to) {
      let path = Pathing.highway_path(from, to);

      for (let pos of path) {
          console.log('pos', pos);
          if (!Game.rooms[pos.roomName]) {
              console.log('No room', pos.roomName);
              return;
          }
      }
      for (let pos of path) {
          Game.rooms[pos.roomName].createConstructionSite(pos, STRUCTURE_ROAD);
      }
}
