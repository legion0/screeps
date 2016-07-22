let FlagGroup = require('FlagGroup');
let Pathing = require('Pathing');

class FlagPath {
	// @private
	constructor(name, flags) {
		this.name = name;
		this.flags = flags;
	}



	static _build_flag_group(name, from, to) {
		let path = Pathing.highway_path(from, to);

		let flags = new FlagGroup(name);

		let j = 0;
		// TODO: does stepping on the last spot makes sense or should we just navigate from 5 squares away ?
		for (let i = 5; i < path.length - 5; i+=5) {
			let pos = path[i];
			let flag_name = name + '-' + (j++);
			let create_res = pos.createFlag(flag_name);
			if (create_res != flag_name) {
				console.log('ERROR', 'Cannot create flag', flag_name, 'because of error', create_res);
				// TODO: roll back existing flags
				return;
			}
			let flag = Game.flgas[flag_name];
			flags.add_flag(flag);
		}
		return flags;
	}

	static create(source, destination) {
		let name = source.to_string() + '-' + destination.to_string();
		let flags = FlagPath._build_flag_group(name, source, destination);
		return new FlagPath(name, flags);
	}

	static load(name) {
		let flags = FlagGroup.load(name);
		return new FlagPath(name, flags);
	}
}

Room.prototype.FlagPath = FlagPath;

module.exports = FlagPath;
