class MyCreep {
	constructor(creep) {
		this.creep = creep;
	}
	get room() {
		return this.creep.room;
	}
    get pos() {
        return this.creep.pos;
    }
	get memory() {
		return this.creep.memory;
	}

	get action() {
        return this.creep.action;
	}
    set action(action) {
        this.creep.action = action;
    }

    get source() {
        return this.creep.source;
	}
    set source(source) {
        this.creep.source = source;
    }

    get target() {
        return this.creep.target;
	}
    set target(target) {
        this.creep.target = target;
    }

    log() {
        this.creep.log.apply(this.creep, arguments);
    }

    run() {
        throw new Error("Not Implemented !!!");
    }

    resign() {
        this.log('resigning');
        this.creep.deleteMemory();
    }
}

module.exports = MyCreep;
