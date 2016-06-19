var BinaryCreep = require('creep.BinaryCreep')

class Mule extends BinaryCreep {
	constructor(creep) {
		super(creep);
		this.min_container_load = 0.0;
	}

	findSource(old_source) {
		return this.creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: this.isValidSource});
	}

	findTarget() {
		return this.creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: this.isValidTarget});
	}

	isValidSource(source) {
		return source.structureType == STRUCTURE_CONTAINER && source.store[RESOURCE_ENERGY] > this.min_container_load * source.storeCapacity;
	}

	isValidTarget(target) {
		return [STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_TOWER].indexOf(target.structureType) != -1 && target.energy < target.energyCapacity;
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
		return source.transfer(this.creep, RESOURCE_ENERGY);
	}

	onCannotReaquireTarget() {
	}
	onCannotReaquireSource() {
	}

	onNoPathToSource(source) {
	}
	onNoPathToTarget(target) {
	}
}

module.exports = Mule;
