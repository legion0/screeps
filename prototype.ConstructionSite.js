var CONSTANTS = require('constants');
var events = require('events');

events.listen(CONSTANTS.EVENT_TICK_START, () => {
    // console.log('ConstructionSite', 'EVENT_TICK_START');

    for (var room_name in Game.rooms) {
        var room = Game.rooms[room_name];
        var new_sites = room.find(FIND_CONSTRUCTION_SITES, {filter: (site) => site.memory.construction_start_time === undefined});
        for (var site of new_sites) {
            site.memory.construction_start_time = Game.time;
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
