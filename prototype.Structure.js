
Object.defineProperty(Structure.prototype, "mule_id", {
    get: function () {
        if (this._mule_id === undefined) {
            this._mule_id = this.memory.mule;
            if (this._mule_id === undefined) {
                this._mule_id = this.memory.mule = null;
            }
        }
        return this._mule_id;
    },
    set: function (mule_id) {
        this._mule_id = this.memory.mule = mule_id;
    }
});

Object.defineProperty(Structure.prototype, "mule", {
    get: function () {
        if (this._mule_object === undefined) {
            if (this.mule_id) {
                this._mule_object = Game.getObjectById(this.mule_id);
            } else {
                this._mule_object = null;
            }
        }
        return this._mule_object;
    },
    set: function (mule_object) {
        this._mule_object = mule_object;
        this.mule_id = mule_object ? mule_object.id : null;
    }
});
