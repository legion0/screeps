var HarvesterRole = require('role.harvester');

function UpgraderRole(creep) {
    var that = new HarvesterRole(creep);
    that.inner_action = this.inner_action;
    that.findTarget = this.findTarget;
    that.isValidTarget = this.isValidTarget;
    return that;
}

UpgraderRole.prototype.inner_action = function(target) {
    return this.creep.upgradeController(target);
};
UpgraderRole.prototype.findTarget = function() {
    // this.log('looking for new target, old=', this.creep.memory.target);
    return this.creep.room.controller;
};
UpgraderRole.prototype.isValidTarget = function(target) {
    return true;
};

module.exports = UpgraderRole;
