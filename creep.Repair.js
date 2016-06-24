var BinaryCreep = require('creep.BinaryCreep')

class Repair extends BinaryCreep {
	constructor(creep) {
		super(creep);
		this.min_container_load = 0.0;
	}

	findSource(old_source) {
		return this.pos.findClosestByRange(FIND_STRUCTURES, {filter: (structure) => this.isValidSource(structure)});
	}

	findTarget() {
		let structures = this.room.find(FIND_STRUCTURES, {filter: (structure) => this.isValidTarget(structure)});

		let targets = structures.filter((s) => this.isValidTarget1(s))
		.sort((a,b) => a.health - b.health);
		if (targets.length) {
			return targets[0];
		}
		targets = structures.filter((s) => this.isValidTarget2(s))
		.sort((a,b) => a.health - b.health);
		if (targets.length) {
			return targets[0];
		}
		targets = structures.filter((s) => this.isValidTarget3(s))
		.sort((a,b) => a.health - b.health);
		if (targets.length) {
			return targets[0];
		}
		return null;
	}

	isValidSource(source) {
		return source.structureType == STRUCTURE_CONTAINER &&
		source.store[RESOURCE_ENERGY] > this.min_container_load * source.storeCapacity;
	}

	isValidTarget(target) {
		return this.isValidTarget1(target) || this.isValidTarget2(target) || this.isValidTarget3(target);
	}

	isValidTarget1(target) {
		return target.structureType == STRUCTURE_TOWER && target.hits < target.hitsMax;
	}
	isValidTarget2(target) {
		return [STRUCTURE_EXTENSION, STRUCTURE_SPAWN].indexOf(target.structureType) != -1 && target.hits < target.hitsMax;
	}
	isValidTarget3(target) {
		return target.structureType == STRUCTURE_WALL && target.hits < target.hitsMax;
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
		return this.creep.repair(target);
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

module.exports = Repair;
