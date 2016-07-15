var BinaryCreep = require('creep.BinaryCreep')

class Upgrader extends BinaryCreep {
	constructor(creep) {
		super(creep);
		this.min_container_load = 0.2;
		this.min_storage_load = 0.01;
	}

	findSource(old_source) {
		let storage = this.creep.room.storage;
        if (storage) {
            return this.isValidSource(storage) ? storage : null;
        }
        let pos = this.creep.pos;
        if (this.creep.target) {
            pos = this.creep.target.pos;
        }
	    let source = pos.findClosestByRange(FIND_STRUCTURES, {filter: (source) => this.isValidSource(source)});
	    return source;
	}

	findTarget(old_target) {
		return this.creep.room.controller;
	}

	isValidSource(source) {
		return source.structureType == STRUCTURE_STORAGE   && source.store.energy > this.min_storage_load   * source.storeCapacity ||
               source.structureType == STRUCTURE_CONTAINER && source.store.energy > this.min_container_load * source.storeCapacity;
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
