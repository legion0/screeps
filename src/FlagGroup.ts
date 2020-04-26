import { log } from './Logger';

declare global {
	interface Memory {
		flag_groups: FlagGroupMemory[];
	}
}

interface FlagGroupMemory {
	hidden: boolean;
	flags: string[];
}

export class FlagGroup {
	private name: string;
	private memory: FlagGroupMemory;

	// Loads the flag group if it exists or creates it if it does not.
	constructor(flagGroupName: string) {
		this.name = flagGroupName;
		this.initMemory();
	}

	private initMemory() {
		MemInit(Memory, 'flag_groups', {});
		this.memory = MemInit(Memory.flag_groups, this.name, {});
		MemInit(this.memory, 'flags', []);
		MemInit(this.memory, 'hidden', false);
	}

	addFlag(flag: Flag) {
		flag.setGroup(this);
		this.memory.flags.push(flag.name);
	}

	// getFlags(): string[] {
	// 	return this.memory.flags.map(name => Memory.flags[name]);
	// }

	hide() {
		for (let flagName of this.memory.flags) {
			let flagObject = Game.flags[flagName];
			if (flagObject) {
				flagObject.hide();
			} else {
				log.e(`Failed to hide flag [${flagName}] because it is not a Game flag object`);
			}
		}
		this.memory.hidden = true;
	}

	show() {
		for (let flagName of this.memory.flags) {
			Flag.prototype.show(flagName);
		}
		this.memory.hidden = false;
	}

	remove() {
		if (this.memory.hidden) {
			this.show();
		}
		for (let flagName of this.memory.flags) {
			Flag.prototype.remove2(flagName);
		}
		delete Memory.flag_groups[this.name];
	}
}
