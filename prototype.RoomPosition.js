Object.defineProperty(RoomPosition.prototype, "terrain", {
    get: function() {
        return Game.map.getTerrainAt(this);
    }
});
