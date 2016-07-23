let FlagGroup = require('FlagGroup');
let Pathing = require('Pathing');

class FlagPath {
	// @private
	constructor(name, flags) {
		this.name = name;
		this.flags = flags;
	}

	get_first_waypoint(current_pos) {
		let flags = this.flags.get_flags();
		let first = flags[0];
		let last = flags[flags.length - 1];
		let first_pos = Flag.prototype.get_pos(first);
		let last_pos = Flag.prototype.get_pos(last);
		return first_pos.getRangeTo(current_pos) < last_pos.getRangeTo(current_pos) ?
			{
				pos: first_pos,
				_index: 0,
				_direction: 1,
			} : {
				pos: last_pos,
				_index: flags.length - 1,
				_direction: -1,
			}
	}

	get_next_waypoint(prev_waypoint) {
		let flags = this.flags.get_flags();
		let new_index = prev_waypoint._index + prev_waypoint._direction;
		if (-1 == new_index || new_index == flags.length) {
			return null;
		}
		let next_path = prev_waypoint._direction == 1 ?
			Memory.flags[flags[prev_waypoint._index]].forward_path :
			Memory.flags[flags[prev_waypoint._index]].backward_path;
		// next_path = next_path.map(o => new RoomPosition(o.x, o.y, o.roomName));
		return {
			path: next_path,
			_index: new_index,
			_direction: prev_waypoint._direction,
		};
	}

	walk(creep) {
		if (!creep.memory.flag_path) {
			creep.memory.flag_path = this.get_first_waypoint(creep.pos);
		}
		let pos = creep.memory.flag_path.pos;
		if (pos) {
			pos = new RoomPosition(pos.x, pos.y, pos.roomName);
			if (!creep.pos.isEqualTo(pos)) {
				// TODO: Error handling
				creep.moveTo(pos);
				return true;
			}
		}

		return this._walk_to_waypoint(creep);
	}

	_walk_to_waypoint(creep) {
		if (!creep.memory.flag_path.path || !creep.memory.flag_path.path.length) {
		    creep.memory.flag_path = this.get_next_waypoint(creep.memory.flag_path);
		}
		if (!creep.memory.flag_path) {
			creep.log('END OF FLAG PATH');
			return false;
		}

		let pos = creep.memory.flag_path.path[0];
		if (this._walk_to_pos(creep, pos)) {
			return true;
		}

		creep.memory.flag_path.path.shift();
		return this._walk_to_waypoint(creep);
	}

	_walk_to_pos(creep, pos) {
		pos = new RoomPosition(pos.x, pos.y, pos.roomName);
		if (!creep.pos.isEqualTo(pos)) {
			// TODO: Error handling
			let direction = creep.pos.getDirectionTo(pos);
			creep.move(direction);
			return true;
		}
		return false;
	}

	static _build_flag_group(name, path) {
		let flags = new FlagGroup(name);

		let j = 0;
		// TODO: does stepping on the last spot makes sense or should we just navigate from 5 squares away ?
		for (let i = 0; i < path.length; i+=5) {
			let pos = path[i];
			let flag_name = name + '-' + (j++);
			let create_res = pos.createFlag(flag_name);
			if (create_res != flag_name) {
				console.log('ERROR', 'Cannot create flag', flag_name, 'because of error', create_res);
				// TODO: roll back existing flags
				return;
			}
			let flag = Game.flags[flag_name];
			flags.add_flag(flag);
		}
		return flags;
	}

	_build_paths() {
		let prev_flag = null;
		for (let flag_name of this.flags.get_flags()) {
			let flag = Game.flags[flag_name];
			if (prev_flag) {
				let path = Pathing.highway_path(prev_flag.pos, flag.pos, 0);
				prev_flag.memory.forward_path = path;
				path = path.slice(0);
				path.pop();
				path.reverse();
				path.push(prev_flag.pos);
				flag.memory.backward_path = path;
			}
			prev_flag = flag;
		}
	}

	_hide() {
		this._build_paths();
		this.flgas.hide();
	}

	static create(from, to) {
		let path = Pathing.highway_path(from, to);
		path = path.slice(2, path.length - 2);
		let name = path[0].to_string() + '-' + path[path.length - 1].to_string();
		let flags = FlagPath._build_flag_group(name, path);
		let flag_path = new FlagPath(name, flags);
		flag_path._build_paths();
		return flag_path;
	}

	static load(name) {
		let flags = FlagGroup.load(name);
		if (!flags) {
			return null;
		}
		return new FlagPath(name, flags);
	}
}

Room.prototype.FlagPath = FlagPath;

module.exports = FlagPath;
