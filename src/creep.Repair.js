var BinaryCreep = require('creep.BinaryCreep')

let TARGET_VALIDATORS = [
	(target) => target.structureType == STRUCTURE_TOWER && target.hits < target.hitsMax,
	(target) => [STRUCTURE_EXTENSION, STRUCTURE_SPAWN].indexOf(target.structureType) != -1 && target.hits < target.hitsMax,
	(target) => target.structureType == STRUCTURE_WALL && target.hits < target.hitsMax
];

class Repair extends BinaryCreep {
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

	findTarget() {
		let structures = this.room.find(FIND_STRUCTURES, {filter: (structure) => this.isValidTarget(structure)});

		for (let validator of TARGET_VALIDATORS) {
			let targets = structures.filter((s) => validator(s));
			let target = Array.prototype.findSortedFirst.call(targets, (a,b) => {
				let delta = a.health - b.health;
				if (delta) {
					return delta;
				}
				return a.pos.getRangeTo(this.creep) - b.pos.getRangeTo(this.creep);
			});
			if (target) {
				return target;
			}
		}
		return null;
	}

	isValidSource(source) {
		return source.structureType == STRUCTURE_STORAGE   && source.store.energy > this.min_storage_load   * source.storeCapacity ||
               source.structureType == STRUCTURE_CONTAINER && source.store.energy > this.min_container_load * source.storeCapacity;
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
