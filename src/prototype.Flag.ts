import { FlagGroup } from "./FlagGroup";
import { log } from './Logger';
import { errorCodeToString, isErrorCode } from "./constants";

declare global {
	interface FlagMemory {
		name: string;
		color: ColorConstant;
		secondaryColor: ColorConstant;
		pos: RoomPositionMemory;
		hidden: boolean;
	}
}

declare global {
	interface Flag {
		getMemory(flagName: string): FlagMemory;
		getPos(flagName: string): RoomPosition;
		hide(): void;
		remove2(flagName: string): void;
		setGroup(flagGroup: FlagGroup): void;
		show(flagName: string): void;
	}
}

Flag.prototype.setGroup = function (flagGroup: FlagGroup): void {
	return this.memory.group;
};

Flag.prototype.hide = function () {
	this.memory.color = this.color;
	this.memory.secondaryColor = this.secondaryColor;
	this.memory.pos = this.pos;
	this.memory.hidden = true;
	this.remove();
}

// @static
Flag.prototype.remove2 = function (flagName: string): void {
	if (Game.flags[flagName]) {
		Game.flags[flagName].remove();
	}
	if (Memory.flags[flagName]) {
		delete Memory.flags[flagName];
	}
}

// @static
Flag.prototype.show = function (flagName: string): void {
	let memory = Memory.flags[flagName];
	if (!memory || !memory.hidden) {
		log.e(`Failed to show flag [${memory.name}] because it has no memory or is not hidden`);
		return;
	}
	let pos = RoomPosition.prototype.fromMemory(memory.pos);
	let rv = pos.createFlag(memory.name, memory.color, memory.secondaryColor);
	if (isErrorCode(rv)) {
		log.e(`Failed to show flag [${memory.name}] with error: [${errorCodeToString(rv)}]`);
		return;
	}
	memory.hidden = false;
}

// @static
Flag.prototype.getPos = function (flagName: string): RoomPosition {
	let flag = Game.flags[name];
	if (flag) {
		return flag.pos;
	}
	let memory = Memory.flags[name];
	if (memory && memory.pos) {
		return RoomPosition.prototype.fromMemory(memory.pos);
	}
	return null;
}

Flag.prototype.getMemory = function (flagName: string): FlagMemory {
	return MemInit(Memory.flags, flagName, {});
}
