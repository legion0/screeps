var CONSTANTS = require('constants');
var events = require('events');

function shouldSaveStructure(structure_type) {
    return [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_WALL, STRUCTURE_CONTAINER].indexOf(structure_type) != -1;
}

function saveStructureLocation(room, pos, structure_type) {
    let saved_structures = room.memory.saved_structures;
    if (!saved_structures) {
        saved_structures = room.memory.saved_structures = [];
    }
    let structure = {
        x: pos.x,
        y: pos.y,
        type: structure_type,
        time: Game.time
    };
    for (let s of saved_structures) {
        if (s.x == structure.x && s.y == structure.y && s.structure_type == structure.structure_type) {
            return;
        }
    }
    saved_structures.push(structure);
}

function removeStructureLocation(room, pos, structure_type) {
    let saved_structures = room.memory.saved_structures;
    if (!saved_structures) {
        return;
    }
    let idx = -1;
    for (let i = 0; i < saved_structures.length; ++i) {
        let s = saved_structures[i];
        if (s.x == pos.x && s.y == pos.y) {
            idx = i;
            break;
        }
    }
    if (idx != -1) {
        saved_structures.splice(idx, 1);
    }
}

function saveStructureLocations() {
    for (let id of Object.keys(Game.constructionSites)) {
        let construction_site = Game.constructionSites[id];
        let structure_type = construction_site.structureType;
        if (!construction_site.memory.location_saved && shouldSaveStructure(structure_type)) {
            construction_site.memory.location_saved = true;
            let room = construction_site.room;
            let pos = construction_site.pos;
            saveStructureLocation(room, pos, structure_type);
        }
    }
}

function rebuildMissingStructures() {
    for (let room_name in Game.rooms) {
        let room = Game.rooms[room_name];
        let saved_structures = room.memory.saved_structures;
        if (!saved_structures || !saved_structures.length) {
            return;
        }
        for (let structure of saved_structures) {
            let has_structure = room.lookForAt(LOOK_STRUCTURES, structure.x, structure.y)
            .filter((s) => s.structureType == structure.type).length != 0;
            if (!has_structure) {
                room.createConstructionSite(structure.x, structure.y, structure.type);
            }
        }
    }
}

events.listen(CONSTANTS.EVENT_TICK_START, () => {
    // console.log('Structure', 'EVENT_TICK_START');
    saveStructureLocations();
    if (Game.time % 10 == 0) {
        rebuildMissingStructures();
    }
    // console.log('Structure', 'EVENT_TICK_START', event_name, 'END');
    return true;
});

Object.defineProperty(Structure.prototype, "health", {
    get: function () {
        if (this._health === undefined) {
            this._health = this.hits / this.hitsMax;
        }
        return this._health;
    }
});

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

Structure.prototype.destroy2 = function() {
    removeStructureLocation(this.room, this.pos, this.structureType);
    this.destroy();
}
