var BinaryCreep = require('creep.BinaryCreep')

let TARGET_VALIDATORS = [
	(target) => target.structureType == STRUCTURE_TOWER && target.hits < target.hitsMax,
	(target) => [STRUCTURE_EXTENSION, STRUCTURE_SPAWN].indexOf(target.structureType) != -1 && target.hits < target.hitsMax,
	(target) => target.structureType == STRUCTURE_WALL && target.hits < target.hitsMax
];

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

		for (let validator of TARGET_VALIDATORS) {
			let targets = structures.filter((s) => validator(s))
			.sort((a,b) => a.health - b.health);
			if (targets.length) {
				return targets[0];
			}
		}
		return null;
	}

	isValidSource(source) {
		return source.structureType == STRUCTURE_CONTAINER &&
		source.store[RESOURCE_ENERGY] > this.min_container_load * source.storeCapacity;
	}

	isValidTarget(target) {
		for (let validator of TARGET_VALIDATORS) {
			if (validator(target)) {
				return true;
			}
		}
		return false;
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
