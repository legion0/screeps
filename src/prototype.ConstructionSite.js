var CONSTANTS = require('constants');
var events = require('events');

events.listen(CONSTANTS.EVENT_TICK_START, () => {
    // console.log('ConstructionSite', 'EVENT_TICK_START');

    for (var room_name in Game.rooms) {
        var room = Game.rooms[room_name];
        var new_sites = room.find(FIND_CONSTRUCTION_SITES, {filter: (site) => site.memory.construction_start_time === undefined});
        for (var site of new_sites) {
            let saved_structures = room.memory.saved_structures;
            let construction_time = Game.time;
            if (saved_structures && saved_structures.length) {
                for (let structure of saved_structures) {
                    if (structure.x == site.pos.x && structure.y == site.pos.y && structure.type == site.structureType) {
                        construction_time = structure.time;
                        break;
                    }
                }
            }
            site.memory.construction_start_time = construction_time;
        }
    }

    // console.log('ConstructionSite', 'EVENT_TICK_START', 'END');
    return true;
});

Object.defineProperty(ConstructionSite.prototype, "construction_start_time", {
    get: function() {
        return this.memory.construction_start_time;
    }
});

ConstructionSite.prototype.remove2 = function() {
    removeStructureLocation(this.room, this.pos, this.structureType);
    this.remove();
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