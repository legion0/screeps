var CONSTANTS = require('constants');
var events = require('events');
var HarvesterCreep = require('creep.Harvester');

function HarvesterRole(creep) {
  this.creep = creep;
  this.memory = creep.memory;
};

HarvesterRole.prototype.log = function() {
    this.creep.log.apply(this.creep, arguments);
};

HarvesterRole.prototype.run = function() {

    new HarvesterCreep(this.creep).run();
    return;
    
    var creep = this.creep;

    // Step away from the source
    if (this.source && this.creep.pos.getRangeTo(this.source.pos) == 1 && creep.carry.energy == creep.carryCapacity) {
        creep.moveTo(creep.room.controller);
        return;
    }

    if (this.roadMaintenance()) {
        return;
    }

    var old_action = this.action;
    this.action = this.selectAction();

    if (this.action && !old_action) {
        this.onActionStart();
    } else if (old_action && !this.action) {
        this.onActionEnd();
    } else if (this.action) {
        this.onActionContinue();
    } else {
        this.harvest();
    }
};
HarvesterRole.prototype.onCannotReaquireTarget = function() {
    this.log("No target found, abandoning role", 'this.target=', this.target);
    this.creep.deleteMemory();
}

HarvesterRole.prototype.onActionStart = function() {
    if (this.source instanceof Source) {
        this.source.unregisterCreep(this.creep);
    }
    this.target = this.findTarget();
    this.onActionContinue();
};
HarvesterRole.prototype.onActionEnd = function() {
    this.source = this.findSource();
    this.harvest();
};
HarvesterRole.prototype.onActionContinue = function() {
    var creep = this.creep;
    if (!this.target || !this.isValidTarget(this.target)) {
        var new_target = this.findTarget();
        if (new_target) {
            this.target = new_target;
        } else {
            this.onCannotReaquireTarget();
            return;
        }
    }
    var ret_val = this.innerAction(this.target);
    if(ret_val == ERR_NOT_IN_RANGE) {
        creep.moveTo(this.target);
    } else if ([OK, ERR_NOT_ENOUGH_ENERGY].indexOf(ret_val) == -1) {
        this.log('ERROR ERROR ERROR ERROR ERROR', 'Got action ret_val of', ret_val);
    }
};
HarvesterRole.prototype.selectAction = function() {
    var creep = this.creep;
    if (this.action && creep.carry.energy == 0 || this.action == null && creep.carry.energy < creep.carryCapacity) {
        return false;
    } else if ((!this.target || !this.action) && creep.carry.energy == creep.carryCapacity) {
        // this.log('Harvesting done', this.source);
        return true;
    }
    return this.action;
};
HarvesterRole.prototype.innerAction = function(target) {
    return this.creep.transfer(target, RESOURCE_ENERGY);
};
HarvesterRole.prototype.harvest = function() {
    var creep = this.creep;
    if (!this.source) {
        this.source = this.findSource();
        if (!this.source) {
            return;
        }
    }
    var harvest_res = creep.harvest(this.source);
    if (harvest_res == ERR_INVALID_TARGET) {
        harvest_res = this.source.transfer(creep, RESOURCE_ENERGY);
    }
    if (harvest_res == OK) {
        if (this.source instanceof Source) {
            this.source.registerCreep(this.creep);
        }
        return;
    } else if (harvest_res == ERR_NOT_IN_RANGE) {
        var move_res = creep.moveTo(this.source);
        var old_source = this.source;
        if (move_res == ERR_NO_PATH) {
            var new_source = this.replaceSource(this.source);
            if (!new_source) {
                return;
            }
            this.source = new_source;
        } else if ([OK, ERR_TIRED].indexOf(move_res) == -1) {
            this.log('ERROR ERROR ERROR ERROR ERROR', 'Got move_res of', move_res);
        }
        if (this.source instanceof Source) {
            this.source.registerCreep(this.creep, old_source);
        }
    } else if (harvest_res == ERR_NOT_ENOUGH_RESOURCES) {
        if (this.source.ticksToRegeneration && this.source.ticksToRegeneration > 50) {
            this.log('Source', this.source.id, 'out of energy and regeneration is', this.source.ticksToRegeneration, 'ticks away.');
            var new_source = this.replaceSource(this.source);
            if (!new_source) {
                return;
            }
            this.source = new_source;
        } else if (this.source.ticksToRegeneration && this.source.ticksToRegeneration < creep.pos.getRangeTo(this.source)) {
            creep.moveTo(this.source);
        }
    } else {
        this.log('ERROR ERROR ERROR ERROR ERROR', 'Got harvest_res of', harvest_res);
    }
};
HarvesterRole.prototype.replaceSource = function(old_source) {
    // console.log('replaceSource', 'START');
    var last_replacement_source_search = this.memory.last_replacement_source_search;
    if (!last_replacement_source_search) {
        last_replacement_source_search = this.memory.last_replacement_source_search = Game.time;
    }
    if (Game.time - last_replacement_source_search < 5) {
        // console.log('replaceSource', 'END');
        return old_source;
    }
    this.memory.last_replacement_source_search = Game.time;
    // this.log('replaceSource ', 'old_source', old_source, 'old_source.load', old_source ? old_source.load : null);
    // this.log('searching for replacment source', 'last_replacement_source_search', last_replacement_source_search, 'current_harvesters', current_harvesters);
    // TODO: Take into account creep efficiency, source clearence and distance to new source
    // var distance_to_new_source = this.creep.pos.getRangeTo(new_source);
    if (!(old_source instanceof Source) || old_source.load > 1.5 || old_source.energy == 0) {
        var new_source = this.findSource();
        // this.log('replaceSource ', 'new_source', new_source, 'new_source.load', new_source ? new_source.load : null, old_source instanceof Source, new_source instanceof Source);
        if (new_source && (!(old_source instanceof Source) || !(new_source instanceof Source) || old_source.energy == 0 || new_source.load + new_source.estimateCreepLoad(this.creep) < 0.75 * old_source.load)) {
            this.log('replaceSource ', old_source.id, old_source.load, '====>', new_source.id, new_source.load);
            // console.log('replaceSource', 'END');
            return new_source;
        }
    } else {
        // this.log('wait');
    }
    // console.log('replaceSource', 'END');
    return old_source;
};
// HarvesterRole.prototype.findSource = function() {
//     var creep = this.creep;
//     var old_source = this.source;
//     var old_source_id = this.source ? this.source.id : null;
//     function sourceFilter(source) {
//         return source.id != old_source_id && source.id != creep.room.memory.lair_source_id && source.energy != 0;
//     };
//     var new_source = null;
//     if (old_source && creep.target) {
//         // We already have a source so find the closet to the target if we collected else where.
//         // If we can't reach the closet search for the next one.
//         new_source = creep.target.pos.findClosestByRange(FIND_SOURCES_ACTIVE, {filter: sourceFilter});
//     } else {
//         new_source = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE, {filter: sourceFilter});
//     }
//     // this.log('looking for new source, old=', old_source, 'new=', source ? source.id : source);
//     return new_source;
// };
HarvesterRole.prototype.findSource = function() {
    var creep = this.creep;
    var old_source = this.source;
    var min_load = Infinity;
    var new_source = null;
    creep.findSourcesActive(this.source ? this.source.id : null).forEach((source) => {
        var load = source.load + source.estimateCreepLoad(creep);
        if (load < min_load) {
            min_load = load;
            new_source = source;
        }
    });
    // this.log('findSource', new_source);
    return new_source;
};
HarvesterRole.prototype.isValidTarget = function(target) {
    return [STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_TOWER].indexOf(target.structureType) != -1 && target.energy < target.energyCapacity ||
        target.structureType == STRUCTURE_CONTAINER && _.sum(target.store) < target.storeCapacity;
};
HarvesterRole.prototype.findTarget = function() {
    // var containers = this.creep.room.find(FIND_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_CONTAINER && _.sum(structure.store) < 0.8 * structure.storeCapacity})
    // .sort((a,b) => a.pos.getRangeTo(this.creep.pos) - b.pos.getRangeTo(this.creep.pos));
    // if (containers.length) {
    //     console.log(containers[0]);
    //     return containers[0];
    // }
    return this.creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: this.isValidTarget});
};
HarvesterRole.prototype.roadMaintenance = function() {
    var creep = this.creep;
    if (creep.carry.energy == 0) {
        return;
    }
    var repair_targets = creep.pos.findInRange(FIND_MY_STRUCTURES, 1, {
        filter: (structure) => structure.hits < structure.hitsMax
    });
    if (creep.room.controller.my) {
        repair_targets = repair_targets.concat(
            creep.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: (structure) => structure.hits < structure.hitsMax && [STRUCTURE_ROAD, STRUCTURE_CONTAINER].indexOf(structure.structureType) != -1
            })
        );
    }
    if (!repair_targets.length) {
        return;
    }
    var ret_val = creep.repair(repair_targets[0]);
    // this.log('REPAIR', repair_targets[0].id, 'ret_val', ret_val);
    if ([OK, ERR_NOT_ENOUGH_ENERGY].indexOf(ret_val) == -1) {
        this.log('ERROR ERROR ERROR ERROR ERROR', 'Got road repair ret_val of', ret_val);
    }
    return ret_val == OK;
};


Object.defineProperty(HarvesterRole.prototype, "target", {
    get: function () {
        return this.creep.target;
    },
    set: function (target) {
        this.creep.target = target;
    }
});
Object.defineProperty(HarvesterRole.prototype, "source", {
    get: function () {
        return this.creep.source;
    },
    set: function (source) {
        this.creep.source = source;
    }
});
Object.defineProperty(HarvesterRole.prototype, "action", {
    get: function () {
        return this.creep.action;
    },
    set: function (action) {
        this.creep.action = action;
    }
});

module.exports = HarvesterRole;