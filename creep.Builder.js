var BinaryCreep = require('creep.BinaryCreep')

var BUILD_ORDER = /*other == -1*/ [STRUCTURE_ROAD, STRUCTURE_CONTAINER, STRUCTURE_EXTENSION, STRUCTURE_SPAWN];

class Builder extends BinaryCreep {
	constructor(creep) {
		super(creep);
		this.min_container_load = 0.0;
	}

	findSource(old_source) {
		var new_source = null;

	    var container = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: (structure) => {
	        return structure.structureType == STRUCTURE_CONTAINER && structure.store[RESOURCE_ENERGY] > this.min_container_load * structure.storeCapacity;
	    }});
	    if (container) {
	        new_source = container;
	    } else {
		    var min_lane_load = Infinity;
		    var min_load_source = null;
		    var creep = this.creep;
		    creep.findSourcesActive(old_source ? old_source.id : null).forEach((source) => {
		    	var lane_load = source.laneLoad2(creep);
		        if (lane_load < min_lane_load) {
		            min_lane_load = lane_load;
		            min_load_source = source;
		        }
		    });
		    new_source = min_load_source;
		}
	    // this.log('new_source', new_source);
	    return new_source;
	}

	findTarget(old_target) {
	    var targets = this.room.find(FIND_CONSTRUCTION_SITES)
	    .sort((a,b) => a.construction_start_time - b.construction_start_time);
	    if (targets.length) {
	        return targets[0];
	    }
	    return null;
	}

	isValidSource(source) {
		return source.energy > 0;
	}

	isValidTarget(target) {
	    return target && target.progress < target.progressTotal;
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
		return this.creep.build(target);
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

module.exports = Builder;
