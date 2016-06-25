var BinaryCreep = require('creep.BinaryCreep')

class Harvester extends BinaryCreep {
	constructor(creep) {
		super(creep);
	}

	findSource(old_source) {
	    var min_lane_load = Infinity;
	    var min_load_source = null;
	    var low_load_source = null;
	    var creep = this.creep;
	    creep.findSourcesActive(old_source ? old_source.id : null).forEach((source) => {
	    	var lane_load = source.laneLoad(creep);
	    	// this.log(source, lane_load);
	    	if (lane_load < 1 && !low_load_source) {
	    		low_load_source = source;
	    	}
	        if (lane_load < min_lane_load) {
	            min_lane_load = lane_load;
	            min_load_source = source;
	        }
	    });
	    var new_source = low_load_source ? low_load_source : min_load_source;
	    // this.log('new_source', new_source, new_source.laneLoad(creep));
	    return new_source;
	}

	findTarget(old_target) {
		return this.creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: this.isValidTarget});
	}

	isValidSource(source) {
		return source.energy > 0 || this.pos.getRangeTo(source) > source.ticksToRegeneration;
	}

	isValidTarget(target) {
	    return [STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_TOWER].indexOf(target.structureType) != -1 && target.energy < target.energyCapacity ||
	        target.structureType == STRUCTURE_CONTAINER && _.sum(target.store) < target.storeCapacity;
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
		return this.creep.transfer(target, RESOURCE_ENERGY);
	}

	innerHarvest(source) {
		let ret_val = this.creep.harvest(source);
		if (ret_val == ERR_NOT_ENOUGH_ENERGY && this.pos.getRangeTo(source) > source.ticksToRegeneration) {
			ret_val = ERR_NOT_IN_RANGE;
		}
		return ret_val;
	}

	onCannotReaquireTarget() {
		// this.log('onCannotReaquireTarget');
	}
	onCannotReaquireSource() {
		// this.log('onCannotReaquireSource');
	}

	onNoPathToSource(source) {
		// this.log('onNoPathToSource');
		let prev_no_path = this.memory.no_path_to_source_time;
		if (prev_no_path === undefined) {
			prev_no_path = this.memory.no_path_to_source_time = Game.time;
		}
		if (Game.time - prev_no_path > 10) {
			// this.log('re evaluating source due to no path');
			this.memory.no_path_to_source_time = Game.time;
			this.source = this.findSource(source);
		}
	}
	onNoPathToTarget(target) {
		// this.log('onNoPathToTarget');
	}
}

module.exports = Harvester;
