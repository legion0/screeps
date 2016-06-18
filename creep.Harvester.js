var BinaryCreep = require('creep.BinaryCreep')

class Harvester extends BinaryCreep {
	constructor(creep) {
		super(creep);
		this.acceptable_action_errors = [];
	}

	findSource(old_source) {
	    var min_round_trip_time = Infinity;
	    var new_source = null;
	    var creep = this.creep;
	    creep.findSourcesActive(old_source ? old_source.id : null).forEach((source) => {
	    	var wait_time = source.waitTime(creep);
	    	var lane_load = source.laneLoad(creep);
	    	var walk_time = creep.pos.getRangeTo(source);
	    	var round_trip_time =  Math.max(walk_time, wait_time) + walk_time;
	        creep.log(source, 'round_trip_time', round_trip_time, 'walk_time', walk_time, 'wait_time', wait_time, 'creeps', source.getCreeps().length);
	        if (round_trip_time < min_round_trip_time) {
	            min_round_trip_time = round_trip_time;
	            new_source = source;
	        }
	    });
	    return new_source;
	}

	findTarget(old_target) {
		return this.creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: this.isValidTarget});
	}

	isValidSource(source) {
		return source.energy > 0;
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

module.exports = Harvester;
