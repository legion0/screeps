let FlagGroup = require('FlagGroup');

Object.defineProperty(Flag.prototype, "_group_name", {
    get: function () {
        if (this.__group_name === undefined) {
            this.__group_name = this.memory.group;
            if (this.__group_name === undefined) {
                this.__group_name = this.memory.group = null;
            }
        }
        return this.__group_name;
    },
    set: function (group_name) {
        this.__group_name = this.memory.group = group_name;
    }
});

Object.defineProperty(Flag.prototype, "group", {
    get: function () {
        if (this._group === undefined) {
            if (this._group_name) {
                this._group = FlagGroup.get_group_by_name(this._group_name);
            } else {
                // TODO: REMOVE
                this._group = new FlagGroup("TEST_GROUP");
                // this._group = null;
            }
        }
        return this._group;
    },
    set: function(group) {
        this._group = group;
        this._group_name = group ? group.name : null;
    }
});

Flag.prototype.hide = function() {
    this.memory.name = this.name;
    this.memory.color = this.color;
    this.memory.secondaryColor = this.secondaryColor;
    this.memory.pos = this.pos;
    this.memory.hidden = true;
    this.remove();
    return true;
}

Flag.prototype.remove2 = function() {
    if (Memory.flags[this.name]) {
        delete Memory.flags[this.name];
    }
    this.remove();
}

// @static
Flag.prototype.show = function(name) {
    let memory = Memory.flags[name];
    if (!memory || !memory.hidden) {
        console.log('ERROR', 'Cannot show flag', memory.name, 'because it has no memory or is not hidden');
        return false;
    }
    let pos = new RoomPosition(memory.pos.x, memory.pos.y, memory.pos.roomName);
    let create_res = pos.createFlag(memory.name, memory.color, memory.secondaryColor);
    if (create_res != memory.name) {
        console.log('ERROR', 'Cannot show flag', memory.name, 'because of error', create_res);
        return false;
    }
    memory.hidden = false;
    return true;
}

// @static
Flag.prototype.get_pos = function(name) {
    let flag = Game.flags[name];
    if (flag) {
        return flag.pos;
    }
    let memory = Memory.flags[name];
    if (memory) {
        return new RoomPosition(memory.pos.x, memory.pos.y, memory.pos.roomName);
    }
}
