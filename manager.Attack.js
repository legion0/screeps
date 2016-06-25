var CONSTANTS = require('constants');
// var events = require('events');

var CAPTURE_FLAG_NAME = 'Capture';
var CAPTURE_FROM_FLAG_NAME = 'CaptureFrom';

function AttackManager() {
    this.memory = Memory.attack_manager;
    if (!this.memory) {
        this.memory = Memory.attack_manager = {};
    }
}
AttackManager.prototype.run = function() {
    if (Game.flags[CAPTURE_FLAG_NAME] && Game.flags[CAPTURE_FROM_FLAG_NAME]) {
        let target_room = Game.flags[CAPTURE_FLAG_NAME];
        let source_room = Game.flags[CAPTURE_FROM_FLAG_NAME];

    }
}

Object.defineProperty(AttackManager.prototype, "repair_target_id", {
    get: function () {
        if (this._repair_target_id === undefined) {
            this._repair_target_id = this.memory.repair_target;
            if (this._repair_target_id === undefined) {
                this._repair_target_id = null;
            }
        }
        return this._repair_target_id;
    },
    set: function (repair_target_id) {
        this.memory.repair_target = this._repair_target_id = repair_target_id;
    }
});

Object.defineProperty(AttackManager.prototype, "repair_target", {
    get: function () {
        if (this._repair_target_object === undefined) {
            if (this.repair_target_id) {
                this._repair_target_object = Game.getObjectById(this.repair_target_id);
            } else {
                this._repair_target_object = null;
            }
        }
        return this._repair_target_object;
    },
    set: function (repair_target_object) {
        this._repair_target_object = repair_target_object;
        this.repair_target_id = repair_target_object ? repair_target_object.id : null;
    }
});

module.exports = AttackManager;
