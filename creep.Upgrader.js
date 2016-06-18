var BinaryCreep = require('creep.BinaryCreep')

class Upgrader extends BinaryCreep {
	constructor(creep) {
		super(creep);
	}

	findSource(old_source) {
	    var min_lane_load = Infinity;
	    var min_load_source = null;
	    var low_load_source = null;
	    var creep = this.creep;
	    creep.findSourcesActive(old_source ? old_source.id : null).forEach((source) => {
	    	var lane_load = source.laneLoad2(creep);
	    	if (lane_load < 1 && !low_load_source) {
	    		low_load_source = source;
	    	}
	        if (lane_load < min_lane_load) {
	            min_lane_load = lane_load;
	            min_load_source = source;
	        }
	    });
	    var new_source = low_load_source ? low_load_source : min_load_source;
	    this.log('new_source', new_source);
	    return new_source;
	}

	findTarget(old_target) {
		return this.creep.room.controller;
	}

	isValidSource(source) {
		return source.energy > 0;
	}

	isValidTarget(target) {
	    return true;
	}

	selectAction(old_action) {
	    if (old_action && _.sum(this.creep.carry) == 0) {
	        return false;
	    } else if (!old_action && _.sum(this.creep.carry) == this.creep.carryCapacity) {
	        return true;
	    }
	    return old_action;
	}

	innerAction(target) {
		return this.creep.upgradeController(target);
	}

	innerHarvest(source) {
		return this.creep.harvest(source);
	}

	onCannotReaquireTarget() {
		// this.log('onCannotReaquireTarget');
	}
	onCannotReaquireSource() {
		// this.log('onCannotReaquireSource');
	}

	onNoPathToSource(source) {
		// this.log('onNoPathToSource');
	}
	onNoPathToTarget(target) {
		// this.log('onNoPathToTarget');
	}
}

module.exports = Upgrader;
