var CONSTANTS = require('constants');
var events = require('events');

var HarvesterRole = require('role.harvester');

function isContainer(structure) {
    return structure.structureType == STRUCTURE_CONTAINER;
}

events.listen(CONSTANTS.EVENT_TICK_START, (event_name) => {
    for (var roomName in Game.rooms) {
        Game.rooms[roomName].find(FIND_STRUCTURES, {filter: isContainer}).forEach((container) => {
            container.memoryShort.mules = 0;
        });
    }
    return true;
});

function MuleRole(creep) {
    var that = new HarvesterRole(creep);
    // that.that = this;
    that.harvest = this.harvest;
    that.findSource = this.findSource;
    that.isValidTarget = this.isValidTarget;
    that.onActionStart = this.onActionStart;
    that.onCannotReaquireTarget = this.onCannotReaquireTarget;
    return that;
}

MuleRole.prototype.harvest = function() {
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
    if (!source) {
        source = Game.getObjectById(creep.memory.source);
    }
    if (!source) {
        return;
    }
    var harvest_res = source.transfer(creep, RESOURCE_ENERGY);
    if (harvest_res == OK) {
        // source.memoryShort.harvesters += 1;
        return;
    } else if (harvest_res == ERR_NOT_ENOUGH_RESOURCES && creep.carry.energy > 0) {
        memory.action = true;
        return;
    } else if ([ERR_NOT_IN_RANGE, ERR_NOT_ENOUGH_RESOURCES].indexOf(harvest_res) == -1) {
        this.log('ERROR ERROR ERROR ERROR ERROR', 'Got harvest_res of', harvest_res);
    }
    var move_res = creep.moveTo(source);
    if ([OK, ERR_NO_PATH].indexOf(move_res) == -1) {
        this.log('ERROR ERROR ERROR ERROR ERROR', 'Got move of', move_res);
    }
}
MuleRole.prototype.findSource = function() {
    var creep = this.creep;
    var memory = creep.memory;
    var old_source = memory.source;
    var source = null;
    
    function sourceFilter(source) {
        return isContainer(source) && source.memoryShortPrev.mules == 0;
    };
    var local_containers = _.filter(creep.pos.lookFor(LOOK_STRUCTURES), sourceFilter);
    if (local_containers.length) {
        source = local_containers[0];
    }
    if (!source) {
        if (old_source && creep.target) {
            // We already have a source so find the closet to the target if we collected else where.
            // If we can't reach the closet search for the next one.
            source = Game.getObjectById(memory.target).pos.findClosestByPath(FIND_STRUCTURES, {filter: sourceFilter});
        } else {
            source = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: sourceFilter});
        }
    }
    if (source) {
        source.memoryShort.mules += 1;
    }
    this.log('looking for new source, old=', old_source, 'new=', source ? source.id : source);
    return source;
}
MuleRole.prototype.isValidTarget = function(target) {
    return [STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_TOWER].indexOf(target.structureType) != -1 && target.energy < target.energyCapacity;
}
MuleRole.prototype.onActionStart = function() {
    this.creep.target = this.findTarget();
};
MuleRole.prototype.onCannotReaquireTarget = function() {
}

module.exports = MuleRole;
