class FlagGroup {

	constructor(name) {
		this.name = name;
		this.init_memory();
		if (this.memory.hidden === undefined) {
			this.memory.hidden = false;
		}
	}

	init_memory() {
		let flag_groups_memory = Memory.flag_groups;
		if (flag_groups_memory === undefined) {
			flag_groups_memory = Memory.flag_groups = {};
		}
		this.memory = flag_groups_memory[this.name];
		if (this.memory === undefined) {
			this.memory = flag_groups_memory[this.name] = {};
		}

		if (this.memory.flags === undefined) {
			this.memory.flags = [];
		}
	}

	add_flag(flag) {
		flag.group = this;
		this.memory.flags.push(flag.name);
	}

	get_flags() {
		return this.memory.flags;
	}

	hide() {
		for (let flag_name of this.memory.flags) {
			let flag_object = Game.flags[flag_name];
			if (flag_object) {
				flag_object.hide();
			} else {
				console.log('ERROR', 'Cannot hide flag', flag_name, 'because it is missing');
			}
		}
		this.memory.hidden = true;
	}

	show() {
		for (let flag_name of this.memory.flags) {
			if (!Flag.prototype.show(flag_name)) {
				return false;
			}
		}
		this.memory.hidden = false;
	}

	remove() {
		if (this.memory.hidden) {
			this.show();
		}
		for (let flag_name of this.memory.flags) {
			let flag_object = Game.flags[flag_name];
			if (flag_object) {
				flag_object.remove2();
			} else {
				console.log('ERROR', 'Cannot remove flag', flag_name, 'because it is missing');
			}
		}
		delete Memory.flag_groups[this.name];
	}

	static load(name) {
		let flag_groups_memory = Memory.flag_groups;
		if (flag_groups_memory === undefined) {
			return null;
		}
		let memory = flag_groups_memory[name];
		if (memory === undefined) {
			return null;
		}
		return new FlagGroup(name);
	}
}

Room.prototype.FlagGroup = FlagGroup;

module.exports = FlagGroup;
