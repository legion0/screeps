var HarvesterRole = require('role.harvester');
var UpgraderRole = require('role.upgrader');

function BuilderRole(creep) {
    var that = new HarvesterRole(creep);
    that.min_container_load = 0.3;
    that.innerAction = this.innerAction;
    that.findTarget = this.findTarget;
    that.isValidTarget = this.isValidTarget;
    that.findSource = new UpgraderRole(creep).findSource;
    return that;
}

BuilderRole.prototype.innerAction = function(target) {
    return this.creep.build(target);
};

var BUILD_ORDER = /*other == -1*/ [STRUCTURE_ROAD, STRUCTURE_CONTAINER, STRUCTURE_EXTENSION, STRUCTURE_SPAWN];

BuilderRole.prototype.findTarget = function() {
    // TODO: set up a list of preference, extensions before roads
    //  this.log('looking for new target, old=', this.creep.memory.target);
    var creep = this.creep;
    var targets = creep.room.find(FIND_CONSTRUCTION_SITES).sort((a,b) => {
        var build_idx_1 = BUILD_ORDER.indexOf(a.structureType);
        var build_idx_2 = BUILD_ORDER.indexOf(b.structureType);
        if (build_idx_1 != build_idx_2) {
            return build_idx_2 - build_idx_1;
        }
        if (build_idx_1 > 0) {
            return b.progress - a.progress;
        }
        return b.pos.getRangeTo(creep) - a.pos.getRangeTo(creep);
        
    });
    if (targets.length) {
        return targets[0];
    }
    return null;
};
BuilderRole.prototype.isValidTarget = function(target) {
    return target && target.progress < target.progressTotal;
};

module.exports = BuilderRole;