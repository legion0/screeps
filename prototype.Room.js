Room.prototype.findMyExtensions = function() {
    return this.find(FIND_MY_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_EXTENSION});
};

Room.prototype.findKeeperLairs = function() {
    return this.find(FIND_HOSTILE_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_KEEPER_LAIR});
};

Room.prototype.findSources = function() {
    return this.find(FIND_SOURCES);
};

Room.prototype.findTowers = function() {
    return this.find(FIND_MY_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_TOWER});
};
