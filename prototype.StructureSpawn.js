Object.defineProperty(StructureSpawn.prototype, "energyAvailable", {
    get: function() {
        return this.room.findMyExtensions().reduce(function(total_energy, extension) {
            return total_energy + extension.energy;
        }, 0);
    }
});
