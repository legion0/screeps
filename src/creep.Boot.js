var BinaryCreep = require('creep.BinaryCreep')

class Boot extends BinaryCreep {
	constructor(creep) {
		super(creep);
		this.invalidate_source_on_action_start = false;
		this.invalidate_target_on_action_start = false;
		this.invalidate_source_on_action_end = false;
		this.invalidate_target_on_action_end = false;
	}

	findSource(old_source) {
	    return this.source;
	}

	findTarget(old_target) {
	    if (this.memory.container === undefined) {
            let container_construction_sites = this.source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {filter: s => s.structureType == STRUCTURE_CONTAINER});
            if (container_construction_sites.length) {
                this.memory.container = container_construction_sites[0].id;
            }

		}
	    let spawn = Game.getObjectById(this.memory.spawn);
	    let container = Game.getObjectById(this.memory.container);

	   // if (spawn.energy < spawn.energyCapacity) {
	   //     return spawn;
	   // } else {
	   //     return container;
	   // }
	   return container;
	}

	isValidSource(source) {
		return true;
	}

	isValidTarget(target) {
	    return target.structureType == STRUCTURE_SPAWN && target.energy < target.energyCapacity || target.structureType == STRUCTURE_CONTAINER && target.progress < target.progressTotal;
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
	   // this.target = this.findTarget();
	    if (target instanceof ConstructionSite) {
	        return this.creep.build(target);
	    } else {
		    return this.creep.transfer(target, RESOURCE_ENERGY);
	    }
	}

	innerHarvest(source) {
		let ret_val = this.creep.harvest(source);
		if (ret_val == ERR_NOT_ENOUGH_ENERGY && this.pos.getRangeTo(source) > source.ticksToRegeneration) {
			ret_val = ERR_NOT_IN_RANGE;
		}
		return ret_val;
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

Boot.ROLE = 'BOOT';

Boot.BODY_PARTS = [WORK, WORK, CARRY, MOVE];

module.exports = Boot;
