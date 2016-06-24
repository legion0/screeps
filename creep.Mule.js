var BinaryCreep = require('creep.BinaryCreep')

function sourceIsBound(source) {
	return source.mule && source.mule.source == source;
}
function sourceIsAvailableToCreep(source, creep) {
	return !sourceIsBound(source) || source.mule == creep;
}

class Mule extends BinaryCreep {
	constructor(creep, fill_spawns) {
		super(creep);
		this.fill_spawns = fill_spawns;
		this.min_container_load = 0.0;
		this.invalidate_source_on_action_start = false;
		this.invalidate_source_on_action_end = true;
	}

	findSource(old_source) {
		let source = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: (source) => this.isValidFirstSource(source)});
		if (source) {
			source.mule = this.creep;
			return source;
		}
		return this.creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: (source) => this.isValidSecondSource(source)});
	}

	findTarget() {
		if (this.fill_spawns) {
			return this.creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: (target) => this.isValidFirstTarget(target)});
		}
		let target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: (target) => this.isValidSecondTarget(target)});
		if (target) {
			return target;
		}
		target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: (target) => this.isValidThirdTarget(target)});
		if (target) {
			return target;
		}
		return this.creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: (target) => this.isValidForthTarget(target)});
	}

	isValidSource(source) {
		return this.isValidFirstSource(source) || this.isValidSecondSource(source);
	}

	isValidFirstSource(source) {
		return source.structureType == STRUCTURE_CONTAINER &&
		source.store[RESOURCE_ENERGY] > this.min_container_load * source.storeCapacity &&
		sourceIsAvailableToCreep(source, this.creep);
	}
	isValidSecondSource(source) {
		return source.structureType == STRUCTURE_CONTAINER &&
		source.store[RESOURCE_ENERGY] > this.min_container_load * source.storeCapacity;
	}

	isValidTarget(target) {
		return this.isValidFirstTarget(target) ||
			this.isValidSecondTarget(target) ||
			this.isValidThirdTarget(target) ||
			this.isValidForthTarget(target);
	}

	isValidFirstTarget(target) {
		return this.fill_spawns &&
			[STRUCTURE_EXTENSION, STRUCTURE_SPAWN].indexOf(target.structureType) != -1 &&
			target.energy < target.energyCapacity;
	}

	isValidSecondTarget(target) {
		return !this.fill_spawns &&
			target.structureType == STRUCTURE_TOWER &&
			target.energy < target.energyCapacity;
	}

	isValidThirdTarget(target) {
		return !this.fill_spawns &&
			[STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_TOWER].indexOf(target.structureType) != -1 &&
			target.energy < target.energyCapacity;
	}

	isValidForthTarget(target) { // balance containers
		return !this.fill_spawns &&
			target.structureType == STRUCTURE_CONTAINER &&
			target.store[RESOURCE_ENERGY] < 0.8 * this.source.store[RESOURCE_ENERGY];
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
		this.action = false;
	}
	onCannotReaquireSource() {
	}

	onNoPathToSource(source) {
	}
	onNoPathToTarget(target) {
	}
}

module.exports = Mule;
