Object.defineProperty(RoomPosition.prototype, "terrain", {
    get: function() {
        return Game.map.getTerrainAt(this);
    }
});

// Room.prototype.findClosestHostile = function() {
//     return this.find(FIND_HOSTILE_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_KEEPER_LAIR});
// };


RoomPosition.prototype.findClosestHostile = function() {
    var room = Game.rooms[this.roomName];
    var hostiles = room.findHostileStructures().concat(room.find(FIND_HOSTILE_CREEPS));
    return this.findClosestByRange(hostiles);
};

RoomPosition.prototype.findClosestByPathIgnoreMyCreeps = function(type_or_objects, opts) {
    throw "Not Implemented !!!";
};
