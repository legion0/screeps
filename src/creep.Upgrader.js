var BinaryCreep = require('creep.BinaryCreep')

class Upgrader extends BinaryCreep {
	constructor(creep) {
		super(creep);
		this.min_container_load = 0.2;
	}

	findSource(old_source) {
		var new_source = null;

	    var container = this.room.controller.pos.findClosestByRange(FIND_STRUCTURES, {filter: (structure) => {
	        return structure.structureType == STRUCTURE_CONTAINER && structure.store[RESOURCE_ENERGY] > this.min_container_load * structure.storeCapacity;
	    }});
	    if (container) {
	        new_source = container;
	    } else {
		    var min_lane_load = Infinity;
		    var min_load_source = null;
		    var low_load_source = null;
		    var creep = this.creep;
		    creep.findSourcesActive(old_source ? old_source.id : null).forEach((source) => {
		    	var lane_load = source.laneLoad(creep);
		    	if (lane_load < 1 && !low_load_source) {
		    		low_load_source = source;
		    	}
		        if (lane_load < min_lane_load) {
		            min_lane_load = lane_load;
		            min_load_source = source;
		        }
		    });
		    new_source = low_load_source ? low_load_source : min_load_source;
		}
	    // this.log('new_source', new_source);
	    return new_source;
	}

	findTarget(old_target) {
		return this.creep.room.controller;
	}

	isValidSource(source) {
		return source.energy > 0 || (source.ticksToRegeneration && this.pos.getRangeTo(source) > source.ticksToRegeneration);
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
		var harvest_res = this.creep.harvest(source);
	    if (harvest_res == ERR_INVALID_TARGET) {
	        harvest_res = source.transfer(this.creep, RESOURCE_ENERGY);
	    }
	    return harvest_res;
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
