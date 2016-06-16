var BinaryCreep = require('creep.BinaryCreep')

class Harvester extends BinaryCreep {
	constructor(creep) {
		super(creep);
		this.acceptable_action_errors = [];
	}

	findSource(old_source) {
	    var min_load = Infinity;
	    var new_source = null;
	    var creep = this.creep;
	    creep.findSourcesActive(old_source ? old_source.id : null).forEach((source) => {
	        var load = source.load + source.estimateCreepLoad(creep);
	        if (load < min_load) {
	            min_load = load;
	            new_source = source;
	        }
	    });
	    return new_source;
	}

	findTarget(old_target) {
		return this.creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: this.isValidTarget});
	}

	isValidSource(source) {
		source.energy > 0;
	}

	isValidTarget(target) {
	    return [STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_TOWER].indexOf(target.structureType) != -1 && target.energy < target.energyCapacity ||
	        target.structureType == STRUCTURE_CONTAINER && _.sum(target.store) < target.storeCapacity;
	}

	selectAction() {
	    if (this.action && _.sum(this.creep.carry) == 0) {
	        return false;
	    } else if (!this.action && _.sum(this.creep.carry) == this.creep.carryCapacity) {
	        return true;
	    }
	    return this.action;
	}

	onCannotReaquireTarget() {
		throw "Not Implemented !!!";
	}
	onCannotReaquireSource() {
		throw "Not Implemented !!!";
	}

	onNoPathToSource(source) {
		throw "Not Implemented !!!";
	}
	onNoPathToTarget(target) {
		throw "Not Implemented !!!";
	}
}

module.exports = Harvester;
