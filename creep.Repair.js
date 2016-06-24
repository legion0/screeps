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
		var structures = this.room.find(FIND_STRUCTURES, {filter: this.isValidTarget})
		.sort((a,b) => a.health - b.health);

		if (structures.length) {
			return structures[0];
		}
		return null;
	}

	isValidSource(source) {
		return source.structureType == STRUCTURE_CONTAINER &&
		source.store[RESOURCE_ENERGY] > this.min_container_load * source.storeCapacity;
	}

	isValidTarget(target) {
		return [STRUCTURE_WALL, STRUCTURE_RAMPART, STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_TOWER].indexOf(target.structureType) != -1 && target.hits < target.hitsMax;
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
