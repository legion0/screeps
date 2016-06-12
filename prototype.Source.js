var CONSTANTS = require('constants');
var events = require('events');

events.listen(CONSTANTS.EVENT_TICK_START, (event_name) => {
    // console.log('Source', 'EVENT_TICK_START', event_name);
    for (var roomName in Game.rooms) {
        Game.rooms[roomName].findSources().forEach((source) => {
            source.memoryShort.current_harvesters = 0;
            source.memoryShort.enroute_harvesters = 0;
            source.memoryShort.enroute_harvesters_distance = 0;
        });
    }
    // console.log('Source', 'EVENT_TICK_START', event_name, 'END');
    return true;
});

Object.defineProperty(Source.prototype, "load", {
    get: function() {
        //TODO: cache
        var memoryShortPrev = this.memoryShortPrev;
        var current_harvesters = memoryShortPrev.current_harvesters;
        var enroute_harvesters = memoryShortPrev.enroute_harvesters;
        var enroute_harvesters_distance = memoryShortPrev.enroute_harvesters_distance;
        var average_distance = enroute_harvesters_distance / enroute_harvesters;
        var minnig_time = 25;
        var move_speed = 1.0;
        var load = (current_harvesters + enroute_harvesters) * minnig_time + enroute_harvesters * average_distance * move_speed;
        return load;
    }
});
