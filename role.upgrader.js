var HarvesterRole = require('role.harvester');

function UpgraderRole(creep) {
    var that = new HarvesterRole(creep);
    that.min_container_load = 0.9;
    that.innerAction = this.innerAction;
    that.findTarget = this.findTarget;
    that.isValidTarget = this.isValidTarget;
    that.findSource = this.findSource;
    return that;
}

UpgraderRole.prototype.innerAction = function(target) {
    return this.creep.upgradeController(target);
};
UpgraderRole.prototype.findTarget = function() {
    // this.log('looking for new target, old=', this.creep.memory.target);
    return this.creep.room.controller;
};
UpgraderRole.prototype.isValidTarget = function(target) {
    return true;
};

UpgraderRole.prototype.findSource = function() {
    var creep = this.creep;

    var container = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: (structure) => {
        return structure.structureType == STRUCTURE_CONTAINER && structure.store[RESOURCE_ENERGY] > this.min_container_load * structure.storeCapacity;
    }});
    if (container) {
        return container;
    }
    return HarvesterRole.prototype.findSource.call(this);
};

module.exports = UpgraderRole;
