
Object.defineProperty(Creep.prototype, "harvest_speed", {
    get: function () {
        if (this._harvest_speed === undefined) {
            this._harvest_speed = this.getActiveBodyparts(WORK) * 2;
        }
        return this._harvest_speed;
    }
});
Object.defineProperty(Creep.prototype, "harvest_time_remaining", {
    get: function () {
        // TODO: Take into account other resources
        return (this.carryCapacity - this.carry.energy) / this.harvest_speed;
    }
});

Object.defineProperty(Creep.prototype, "time_to_dest", {
    get: function () {
        if (this._time_to_dest === undefined) {
            var move = this.memory._move;
            if (move) {
                this._time_to_dest = move.path.length;
            } else {
                this._time_to_dest = null;
            }
        }
        return this._time_to_dest;
    }
});

Object.defineProperty(Creep.prototype, "role", {
    get: function () {
        if (this._role === undefined) {
            this._role = this.memory.role;
            if (this._role === undefined) {
                this._role = null;
            }
        }
        return this._role;
    },
    set: function (role) {
        this.memory.role = this._role = role;
    }
});
Object.defineProperty(Creep.prototype, "action", {
    get: function () {
        if (this._action === undefined) {
            this._action = this.memory.action;
            if (this._action === undefined) {
                this._action = null;
            }
        }
        return this._action;
    },
    set: function (action) {
        this.memory.action = this._action = action;
    }
});

Object.defineProperty(Creep.prototype, "target_id", {
    get: function () {
        if (this._target_id === undefined) {
            this._target_id = this.memory.target;
            if (this._target_id === undefined) {
                this._target_id = null;
            }
        }
        return this._target_id;
    },
    set: function (target_id) {
        this.memory.target = this._target_id = target_id;
    }
});
Object.defineProperty(Creep.prototype, "source_id", {
    get: function () {
        if (this._source_id === undefined) {
            this._source_id = this.memory.source;
            if (this._source_id === undefined) {
                this._source_id = null;
            }
        }
        return this._source_id;
    },
    set: function (source_id) {
        this.memory.source = this._source_id = source_id;
    }
});
Object.defineProperty(Creep.prototype, "target", {
    get: function () {
        if (this._target_object === undefined) {
            if (this.target_id) {
                this._target_object = Game.getObjectById(this.target_id);
            } else {
                this._target_object = null;
            }
        }
        return this._target_object;
    },
    set: function (target_object) {
        this._target_object = target_object;
        this.target_id = target_object ? target_object.id : null;
    }
});
Object.defineProperty(Creep.prototype, "source", {
    get: function () {
        if (this._sourcet_object === undefined) {
            if (this.source_id) {
                this._sourcet_object = Game.getObjectById(this.source_id);
            } else {
                this._sourcet_object = null;
            }
        }
        return this._sourcet_object;
    },
    set: function (sourcet_object) {
        this._sourcet_object = sourcet_object;
        this.source_id = sourcet_object ? sourcet_object.id : null;
    }
});

Creep.prototype.log = function() {
    var args = [Game.time, this.role + '(' + this.name + ',' + this.pos.x + ',' + this.pos.y + ')'];
    for(var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
    }
    console.log.apply(null, args);
};

Creep.prototype.deleteMemory = function() {
    delete Memory.creeps[this.name];
}

Creep.prototype.findClosest = function(type, opts) {
    var target = this.pos.findClosestByPath(type, opts);
    if (!target) {
        target = this.pos.findClosestByRange(type, opts);
        // this.log('fallback by range', 'target=', target ? target.id : null);
    }
    // this.log('looking for new target, old=', creep.memory.target, 'new=', target ? target.id : target);
    return target;
};

Creep.prototype.findSourcesActive = function(ignore_source_id) {
    var creep = this;
    return this.room.find(FIND_SOURCES).filter((source) => {
        return (source.energy != 0 || this.pos.getRangeTo(source) > source.ticksToRegeneration) && source.id != this.room.memory.lair_source_id && source.id != ignore_source_id;
    }).sort((a, b) => a.pos.getRangeTo(creep.pos) - b.pos.getRangeTo(creep.pos));
};
