var HarvesterRole = require('role.harvester');

function BuilderRole(creep) {
    var that = new HarvesterRole(creep);
    that.inner_action = this.inner_action;
    that.findTarget = this.findTarget;
    that.isValidTarget = this.isValidTarget;
    return that;
}

BuilderRole.prototype.inner_action = function(target) {
    return this.creep.build(target);
};
BuilderRole.prototype.findTarget = function() {
    //  this.log('looking for new target, old=', this.creep.memory.target);
    var target = this.creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
    if (!target) {
        target = this.creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES);
    }
    return target;
};
BuilderRole.prototype.isValidTarget = function(target) {
    return target && target.progress < target.progressTotal;
};

module.exports = BuilderRole;
