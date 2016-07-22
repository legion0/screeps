class Pathing {
	static highway_path(from, to) {
		let ret = PathFinder.search(
        from, {pos: to, range: 1},
        {
          plainCost: 1,
          swampCost: 1,

          roomCallback: function(roomName) {

            let room = Game.rooms[roomName];
            // In this example `room` will always exist, but since PathFinder
            // supports searches which span multiple rooms you should be careful!
            if (!room) {
                return;
            }
            let costs = new PathFinder.CostMatrix;

            // TODO: export to structure/position property is_walkable
            for (let structure of room.find(FIND_STRUCTURES)) {
              if (structure.structureType !== STRUCTURE_CONTAINER &&
                         (structure.structureType !== STRUCTURE_RAMPART ||
                          !structure.my)) {
                // Can't walk through non-walkable buildings
                costs.set(structure.pos.x, structure.pos.y, 0xff);
              }
            }

            return costs;
          },
        }
      );

      return ret.path;
	}
}

module.exports = Pathing;
