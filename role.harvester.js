var CONSTANTS = require('constants');
var events = require('events');

function HarvesterRole(creep) {
  this.creep = creep;
  this.memory = creep.memory;
};

HarvesterRole.prototype.log = function() {
    this.creep.log.apply(this.creep, arguments);
};

HarvesterRole.prototype.run = function() {
    var creep = this.creep;
    var memory = creep.memory;

    if (this.roadMaintenance()) {
        return;
    }

    var old_action = memory.action;
    this.selectAction();
    if (memory.action && !old_action) {
        this.onActionStart();
    } else if (memory.action) {
        this.onActionContinue();
    }
    if(memory.action) {
        if (!this.target) {
            var new_target = this.findTarget();
            if (new_target) {
                this.target = new_target;
            } else {
                this.onCannotReaquireTarget();
                return;
            }
        }
        this.action(this.target);
    } else {
        this.harvest();
    }
};
HarvesterRole.prototype.onCannotReaquireTarget = function() {
    this.log("No target found, abandoning role", 'memory.target=', this.memory.taget);
    delete Memory.creeps[this.creep.name];
}

HarvesterRole.prototype.onActionStart = function() {
    // this.log('finishd harvesting');
    delete this.memory.source;
    this.target = this.findTarget();
    if (this.target) {
        this.memory.target = this.target.id;
    }
};
HarvesterRole.prototype.onActionContinue = function() {
    this.target = Game.getObjectById(this.memory.target);
};
HarvesterRole.prototype.selectAction = function() {
    var creep = this.creep;
    var memory = creep.memory;
    if (memory.action && creep.carry.energy == 0 || memory.action == undefined && creep.carry.energy < creep.carryCapacity) {
        memory.action = false;
    } else if ((!memory.target || !memory.action) && creep.carry.energy == creep.carryCapacity) {
        memory.action = true;
    }
};
HarvesterRole.prototype.action = function(target) {
    var creep = this.creep;
    var memory = creep.memory;
    if (!target) {
        target = Game.getObjectById(memory.target);
    }
    if (!this.isValidTarget(target)) {
        delete memory.target;
        return;
    }
    var ret_val = this.inner_action(target);
    if(ret_val == ERR_NOT_IN_RANGE) {
        creep.moveTo(target);
    } else if ([OK, ERR_NOT_ENOUGH_ENERGY].indexOf(ret_val) == -1) {
        this.log('ERROR ERROR ERROR ERROR ERROR', 'Got action ret_val of', ret_val);
    }
};
HarvesterRole.prototype.inner_action = function(target) {
    return this.creep.transfer(target, RESOURCE_ENERGY);
};
HarvesterRole.prototype.harvest = function() {
    var creep = this.creep;
    var memory = creep.memory;
    var source = undefined;
    if (!memory.source) {
        source = this.findSource();
        if (!source) {
            return;
        }
        memory.source = source.id;
    }
    if (source == undefined) {
        source = Game.getObjectById(creep.memory.source);
    }
    var harvest_res = creep.harvest(source);
    if (harvest_res == OK) {
        source.memoryShort.current_harvesters += 1;
        return;
    } else if (harvest_res == ERR_NOT_IN_RANGE) {
        source.memoryShort.enroute_harvesters += 1;
        source.memoryShort.enroute_harvesters_distance += creep.time_to_dest;
        if (creep.moveTo(source) == ERR_NO_PATH) {
            var new_source = this.replaceSource(source);
            if (!new_source) {
                return;
            }
            if (new_source != source) {
                this.source  = new_source;
            }
        }
    } else {
        this.log('ERROR ERROR ERROR ERROR ERROR', 'Got harvest_res of', harvest_res);
    }
};
HarvesterRole.prototype.replaceSource = function(old_source) {
    var last_replacement_source_search = this.memory.last_replacement_source_search;
    if (!last_replacement_source_search) {
        last_replacement_source_search = this.memory.last_replacement_source_search = Game.time;
    }
    if (Game.time - last_replacement_source_search < 5) {
        return old_source;
    }
    this.memory.last_replacement_source_search = Game.time;
    // this.log('searching for replacment source', 'last_replacement_source_search', last_replacement_source_search, 'current_harvesters', current_harvesters);
    // TODO: Take into account creep efficiency, source clearence and distance to new source
    // var distance_to_new_source = this.creep.pos.getRangeTo(new_source);
    this.log('old_source.load', old_source.load, 'old_source.id', old_source.id);
    if (old_source.load > 150) {
        var new_source = this.findSource();
        if (!new_source) {
            // this.log('nothing else found');
            return old_source;
        }
        // this.log('replace', old_source.id, new_source.id);
        return new_source;
    } else {
        // this.log('wait');
    }
    return old_source;
};
HarvesterRole.prototype.findSource = function() {
    var creep = this.creep;
    var memory = creep.memory;
    var old_source = memory.source;
    var source = null;
    function sourceFilter(source) {
        return source.id != old_source && source.id != creep.room.memory.lair_source_id;
    };
    if (old_source && memory.target) {
        // We already have a source so find the closet to the target if we collected else where.
        // If we can't reach the closet search for the next one.
        source = Game.getObjectById(memory.target).pos.findClosestByPath(FIND_SOURCES_ACTIVE, {filter: sourceFilter});
    } else {
        source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE, {filter: sourceFilter});
    }
    // this.log('looking for new source, old=', old_source, 'new=', source ? source.id : source);
    return source;
};
HarvesterRole.prototype.isValidTarget = function(target) {
    return [STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_TOWER].indexOf(target.structureType) != -1 && target.energy < target.energyCapacity ||
        target.structureType == STRUCTURE_CONTAINER && _.sum(target.store) < target.storeCapacity;
};
HarvesterRole.prototype.findTarget = function() {
    return this.creep.findClosest(FIND_STRUCTURES, {filter: this.isValidTarget});
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

Object.defineProperty(HarvesterRole.prototype, "_source_id", {
    get: function () {
        if (this.__source_id === undefined) {
            this.__source_id = this.memory.source;
            if (this.__source_id === undefined) {
                this.__source_id = null;
            }
        }
        return this.__source_id;
    },
    set: function (source_id) {
        this.memory.source = this.__source_id = source_id;
    }
});
Object.defineProperty(HarvesterRole.prototype, "source", {
    get: function () {
        if (this._sourcet_object === undefined) {
            if (this._source_id) {
                this._sourcet_object = Game.getObjectById(this._source_id);
            } else {
                this._sourcet_object = null;
            }
        }
        return this._sourcet_object;
    },
    set: function (sourcet_object) {
        this._sourcet_object = sourcet_object;
        this._source_id = sourcet_object ? sourcet_object.id : null;
    }
});

module.exports = HarvesterRole;
