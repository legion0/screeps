class FlagGroup {

	constructor(name) {
		this.name = name;
		this.init_memory();
		if (this.memory.hidden === undefined) {
			this.memory.hidden = false;
		}
	}

	init_memory() {
		let flags_memory = Memory.flags;
		if (flags_memory === undefined) {
			flags_memory = Memory.flags = {};
		}
		this.memory = flags_memory[this.name];
		if (this.memory === undefined) {
			this.memory = flags_memory[this.name] = {};
		}

		if (this.memory.flags === undefined) {
			this.memory.flags = [];
		}
	}

	add_flag(flag) {
		flag.group = this;
		this.memory.flags.push({
			name: flag.name,
			memory: flag.memory,
			color: flag.color,
			secondaryColor: flag.secondaryColor,
			pos: flag.pos,
		});
	}

	update_positions() {
		for (let flag of this.memory.flags) {
			let flag_object = Game.flags[flag.name];
			if (flag_object) {
				flag.pos = flag_object.pos;
			} else {
				console.log('ERROR', 'Cannot update position of flag', flag.name, 'because it is missing');
			}
		}
	}

	get_flags() {
		if (!this.memory.hidden) {
			this.update_positions();
		}
		return this.memory.flags;
	}

	hide() {
		// TODO: add is hidden property and get flag method to flag prototype to get hidden flags ?
		this.memory.hidden = true;
		for (let flag of this.memory.flags) {
			let flag_object = Game.flags[flag.name];
			if (flag_object) {
				flag_object.remove();
			} else {
				console.log('ERROR', 'Cannot hide flag', flag.name, 'because it is missing');
			}
		}
	}

	show() {
		this.memory.hidden = false;
		for (let flag of this.memory.flags) {
			let pos = new RoomPosition(flag.pos.x, flag.pos.y, flag.pos.roomName);
			let create_res = pos.createFlag(flag.name, flag.color, flag.secondaryColor);
			if (create_res != flag.name) {
				console.log('ERROR', 'Cannot show flag', flag.name, 'because of error', create_res);
			}
			Game.flags[flag.name].memory = flag.memory;
		}
	}

	static get_group_by_name(group_name) {
		let flags_memory = Memory.flags;
		if (flags_memory === undefined) {
			return null;
		}
		let memory = flags_memory[group_name];
		if (memory === undefined) {
			return null;
		}
		return new FlagGroup(group_name);
	}
}

module.exports = FlagGroup;
