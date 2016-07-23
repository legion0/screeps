var BinaryCreep = require('creep.BinaryCreep')

function sourceIsAvailableToCreep(source, creep) {
	return !source.is_bound() || source.is_bound(creep);
}

var TARGET_VALIDATORS = [
    (that, target) => {
        return that.fill_spawns &&
			[STRUCTURE_EXTENSION, STRUCTURE_SPAWN].indexOf(target.structureType) != -1 && target.energy < target.energyCapacity;
    },
    (that, target) => {
        return !that.fill_spawns &&
			target.structureType == STRUCTURE_TOWER &&
			target.energy < 0.9 * target.energyCapacity;
    },
    (that, target) => {
        return [STRUCTURE_EXTENSION, STRUCTURE_SPAWN].indexOf(target.structureType) != -1 &&
			target.energy < target.energyCapacity;
    },
   //  (that, target) => {
   //      return !that.fill_spawns &&
			// target.structureType == STRUCTURE_CONTAINER &&
			// that.source &&
			// target.store[RESOURCE_ENERGY] < 0.8 * that.source.store[RESOURCE_ENERGY];
   //  },
    (that, target) => {
        return !that.fill_spawns &&
			target.structureType == STRUCTURE_TOWER &&
			target.energy < target.energyCapacity;
    },
    (that, target) => {
        return !that.fill_spawns &&
			target.structureType == STRUCTURE_STORAGE && _.sum(target.store) < target.storeCapacity;
    },
   //  (that, target) => {
   //      return !that.fill_spawns &&
			// target.structureType == STRUCTURE_CONTAINER &&
			// that.source &&
			// target.store[RESOURCE_ENERGY] < that.source.store[RESOURCE_ENERGY];
   //  },
];

class Mule extends BinaryCreep {
	constructor(creep, fill_spawns) {
		super(creep);
		this.fill_spawns = fill_spawns;
		this.min_container_load = 0.0;
		this.invalidate_source_on_action_start = false;
		this.invalidate_source_on_action_end = false;
	}

	findSource(old_source) {
		return this.source;
	}

	findTarget() {
	    for (let target_validator of TARGET_VALIDATORS) {
	        let target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: (target) => this.isValidTarget(target) && target_validator(this, target)});
	        if (target) {
	            return target;
	        }
	    }
	    if (Game.flags.fill) {
	        return Game.flags.fill.room.storage;
	    }
	    return null;
	}

	isValidSource(source) {
	    if (this.creep.name == 'b') {
	        this.log('isValidSource', this.isValidFirstSource(source) || this.isValidSecondSource(source));
	    }
		return this.isValidFirstSource(source) || this.isValidSecondSource(source);
	}

	isValidFirstSource(source) {
		return source.structureType == STRUCTURE_CONTAINER &&
		source.store[RESOURCE_ENERGY] > this.min_container_load * source.storeCapacity;
	}
	isValidSecondSource(source) {
		return source.structureType == STRUCTURE_CONTAINER &&
		source.store[RESOURCE_ENERGY] > this.min_container_load * source.storeCapacity;
	}

	isValidTarget(target) {
		if (!target.room.controller.my) {
			return false;
		}
	    if (target == this.source) {
	        return false;
	    }
	    if ((this.source instanceof StructureStorage) && (target instanceof StructureContainer)) {
	        return false;
	    }
		for (let target_validator of TARGET_VALIDATORS) {
	        if (target_validator(this, target)) {
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
		let ret_val = this.creep.transfer(target, RESOURCE_ENERGY);
		if (ret_val == ERR_FULL) {
		    this.target = this.findTarget();
		    ret_val = OK;
		}
		return ret_val;
	}

	innerHarvest(source) {
		let harvest_res = this.creep.withdraw(source, RESOURCE_ENERGY);
		if (harvest_res == ERR_NOT_ENOUGH_ENERGY) {
		    if (this.creep.carry.energy != 0) {
		        this.action = true;
		    }
		    harvest_res = OK;
		}
		return harvest_res;
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

Mule.ROLE = 'MULE';
// TODO: make body parts dependant on highway to source and harvesting speed
Mule.BODY_PARTS = [MOVE,CARRY,MOVE,CARRY, MOVE,CARRY,MOVE,CARRY, MOVE,CARRY,MOVE,CARRY, MOVE,CARRY,MOVE,CARRY, MOVE,CARRY,MOVE,CARRY, MOVE,CARRY,MOVE,CARRY, MOVE,CARRY,MOVE,CARRY, MOVE,CARRY,MOVE,CARRY];
// Mule.BODY_PARTS = [CARRY, CARRY,CARRY,MOVE, CARRY,CARRY,MOVE, CARRY,CARRY,MOVE, CARRY,CARRY,MOVE, CARRY,CARRY,MOVE, CARRY,CARRY,MOVE, CARRY,CARRY,MOVE, CARRY,CARRY,MOVE];

module.exports = Mule;
