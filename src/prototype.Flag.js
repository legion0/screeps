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