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
		this.memory.flags.push(flag.name);
	}

	get_flags() {
		if (!this.memory.hidden) {
			this.update_positions();
		}
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

	static load(name) {
		let flags_memory = Memory.flags;
		if (flags_memory === undefined) {
			return null;
		}
		let memory = flags_memory[name];
		if (memory === undefined) {
			return null;
		}
		return new FlagGroup(name);
	}
}

module.exports = FlagGroup;
