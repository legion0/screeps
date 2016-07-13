var BinaryCreep = require('creep.BinaryCreep')


class Builder extends BinaryCreep {
	constructor(creep) {
		super(creep);
		this.min_storage_load = 0.01;
		this.min_container_load = 0.2;
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
	    var targets = this.room.find(FIND_CONSTRUCTION_SITES);
	    let target = Array.prototype.findSortedFirst.call(targets, (a,b) => a.construction_start_time - b.construction_start_time);
	    return target;
	}

	isValidSource(source) {
        return source.structureType == STRUCTURE_STORAGE   && source.store.energy > this.min_storage_load   * source.storeCapacity ||
               source.structureType == STRUCTURE_CONTAINER && source.store.energy > this.min_container_load * source.storeCapacity;
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
	    // TODO: go to randevoue point where you do not disturb anyone and wait for new construction sites.
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
