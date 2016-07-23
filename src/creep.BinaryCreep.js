var MyCreep = require('creep.MyCreep');
let FlagPath = require('FlagPath');

class BinaryCreep extends MyCreep {
	constructor(creep) {
		super(creep);
		if (this.action == null) {
			this.action = true;
		}
		this.invalidate_source_on_action_start = true;
		this.invalidate_target_on_action_start = false;
		this.invalidate_source_on_action_end = false;
		this.invalidate_target_on_action_end = true;
	}

	findSource(old_source) {
		throw new Error("Not Implemented !!!");
	}

	findTarget() {
		throw new Error("Not Implemented !!!");
	}

	isValidSource(source) {
		throw new Error("Not Implemented !!!");
	}

	isValidTarget(target) {
		throw new Error("Not Implemented !!!");
	}

	selectAction(old_action) {
		throw new Error("Not Implemented !!!");
	}

	innerAction(target) {
		throw new Error("Not Implemented !!!");
	}

	innerHarvest(source) {
		throw new Error("Not Implemented !!!");
	}

	onCannotReaquireTarget() {
		throw new Error("Not Implemented !!!");
	}
	onCannotReaquireSource() {
		throw new Error("Not Implemented !!!");
	}

	onNoPathToSource(source) {
		throw new Error("Not Implemented !!!");
	}
	onNoPathToTarget(target) {
		throw new Error("Not Implemented !!!");
	}

	run() {
	    var old_action = this.action;
	    var new_action = this.selectAction(old_action);

	    if (new_action == null) {
	    	this.resign();
		}

		// TODO: this is buggy, it causes creeps to step away and then back near the source if the target is to the other side of the controller.
		// Consider moving to harvesters
	    // if (this._stepAwayFromSource(new_action)) {
	    //     return;
	    // }

	    // pickup stray energy
	    if (this.creep.carry.energy != this.creep.carryCapacity) {
	        var dropped_energies = this.pos.findInRange(FIND_DROPPED_ENERGY, 1);
	        if (dropped_energies.length) {
	            this.creep.pickup(dropped_energies[0]);
	            return;
	        }

	    }

// 		if (this._roadMaintanance()) {
// 			return;
// 		}

	    this.action = new_action;

	    if (this.action && !old_action) {
	        this.onActionStart();
	    } else if (old_action && !this.action) {
	        this.onActionEnd();
	    } else if (this.action) {
	        this.onActionContinue();
	    } else {
	        this.harvest();
	    }
	}

	onActionStart() {
		if (this.memory.flag_path_name) {
			this.memory.use_flag_path = true;
			this.memory.flag_path = null;
		}
		if (this.invalidate_source_on_action_start) {
			this.source = null;
		}
		if (this.invalidate_target_on_action_start) {
			this.target = null;
		}
	    this.onActionContinue();
	}
	onActionEnd() {
		if (this.memory.flag_path_name) {
			this.memory.use_flag_path = true;
			this.memory.flag_path = null;
		}
		if (this.invalidate_target_on_action_end) {
			this.target = null;
		}
		if (this.invalidate_source_on_action_end) {
			this.source = null;
		}
    	this.harvest();
	}

	onActionContinue() {
		var new_target = null;
	    if (!this.target || !this.isValidTarget(this.target)) {
	        new_target = this.findTarget(this.target);
	        if (!new_target) {
	            this.onCannotReaquireTarget();
	            return;
	        }
	    }
	    var target = new_target ? new_target : this.target;
	    var ret_val = this.innerAction(target);
	    if(ret_val == ERR_NOT_IN_RANGE) {
	        var move_res = this.moveTo(target);
	        if (move_res == ERR_NO_PATH) {
	        	this.onNoPathToTarget(target);
	        	return;
	        } else if ([OK, ERR_TIRED].indexOf(move_res) == -1) {
	            this.log('ERROR ERROR ERROR ERROR ERROR', 'Got onActionContinue move_res of', move_res);
	        }
	    } else if (ret_val != OK) {
	        this.log('ERROR ERROR ERROR ERROR ERROR', 'Got innerAction ret_val of', ret_val);
	    }
	    if (new_target) {
	    	this.target = new_target;
	    }
	}
	moveTo(target) {
		if (this.memory.use_flag_path && this.memory.flag_path_name) {
			let flag_path = FlagPath.load(this.memory.flag_path_name);
			if (flag_path) {
				let walk_res = flag_path.walk(this.creep);
				this.memory.use_flag_path = walk_res;
				if (walk_res) {
					return OK;
				}
			}
		}
		return this.creep.moveTo(target);
	}

	harvest() {
		var new_source = null;
	    if (!this.source || !this.isValidSource(this.source)) {
	        new_source = this.findSource(this.source);
	        if (!new_source) {
	        	this.onCannotReaquireSource();
	            return;
	        }
	    }
	    var source = new_source ? new_source : this.source;
	    var ret_val = this.innerHarvest(source);
	    if (ret_val == ERR_NOT_IN_RANGE) {
	        var move_res = this.moveTo(source);
	        if (move_res == ERR_NO_PATH) {
	        	this.onNoPathToSource(source);
	        	return;
	        } else if ([OK, ERR_TIRED].indexOf(move_res) == -1) {
	            this.log('ERROR ERROR ERROR ERROR ERROR', 'Got harvest move_res of', move_res);
	        }
	    } else if (ret_val != OK) {
	    	this.log('ERROR ERROR ERROR ERROR ERROR', 'Got harvest ret_val of', ret_val);
        }
        if (new_source) {
        	this.source = new_source;
    	}
	}

	_roadMaintanance() {
		if (this.creep.carry.energy == 0) {
		    return false;
		}
		var repair_targets = this.creep.pos.findInRange(FIND_STRUCTURES, 1, {
		    filter: (structure) => [STRUCTURE_SPAWN,
			    STRUCTURE_EXTENSION,
			    STRUCTURE_TOWER,
			    STRUCTURE_CONTAINER,
			    STRUCTURE_ROAD].indexOf(structure.structureType) != -1 && structure.hits < structure.hitsMax
		});
		if (!repair_targets.length) {
		    return false;
		}
		var ret_val = this.creep.repair(repair_targets[0]);
		// this.log('REPAIR', repair_targets[0], 'ret_val', ret_val);
		if ([OK, ERR_NOT_ENOUGH_ENERGY].indexOf(ret_val) == -1) {
		    this.log('ERROR ERROR ERROR ERROR ERROR', 'Got road repair ret_val of', ret_val);
		}
		return ret_val == OK;
	}

	_stepAwayFromSource(new_action) {
		if (new_action && this.source && this.creep.pos.getRangeTo(this.source.pos) == 1) {
	        this.creep.moveTo(this.creep.room.controller);
	        return true;
	    }
	    return false;
	}
}

module.exports = BinaryCreep;
