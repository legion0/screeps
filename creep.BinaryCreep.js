var MyCreep = require('creep.MyCreep');

class BinaryCreep extends MyCreep {
	constructor(creep) {
		super(creep);
		if (this.action == null) {
	    	this.action = false;
		}
		this.invalidate_source = true;
		this.invalidate_target = true;
	}

	findSource(old_source) {
		throw "Not Implemented !!!";
	}

	findTarget() {
		throw "Not Implemented !!!";
	}

	isValidSource(source) {
		throw "Not Implemented !!!";
	}

	isValidTarget(target) {
		throw "Not Implemented !!!";
	}

	selectAction() {
		throw "Not Implemented !!!";
	}

	innerAction(target) {
		throw "Not Implemented !!!";
	}

	innerHarvest(source) {
		throw "Not Implemented !!!";
	}

	onCannotReaquireTarget() {
		throw "Not Implemented !!!";
	}
	onCannotReaquireSource() {
		throw "Not Implemented !!!";
	}

	onNoPathToSource(source) {
		throw "Not Implemented !!!";
	}
	onNoPathToTarget(target) {
		throw "Not Implemented !!!";
	}

	run() {
	    var old_action = this.action;
	    var new_action = this.selectAction(old_action);

	    if (new_action == null) {
	    	this.resign();
		}

	    // Step away from the source
	    if (new_action && this.source && this.creep.pos.getRangeTo(this.source.pos) == 1) {
	        this.creep.moveTo(this.creep.room.controller);
	        return;
	    }

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
		if (this.invalidate_source) {
			this.source = null;
		}
	    this.onActionContinue();
	}
	onActionEnd() {
		if (this.invalidate_target) {
			this.target = null;
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
	        var move_res = this.creep.moveTo(target);
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
	        var move_res = this.creep.moveTo(source);
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
}

module.exports = BinaryCreep;
