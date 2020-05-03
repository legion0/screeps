// import { FlagGroup } from "./FlagGroup";
// import { log } from './Logger';
// import { errorCodeToString, isErrorCode } from "./constants";
// import { MemInit } from "./Memory";

// declare global {
// 	interface FlagMemory {
// 		name: string;
// 		color: ColorConstant;
// 		secondaryColor: ColorConstant;
// 		pos: RoomPositionMemory;
// 		hidden: boolean;
// 		group: string;
// 	}
// }

// // export function setGroup(this: Flag, flagGroup: FlagGroup): void {
// // 	this.memory.group;
// // };

// Flag.prototype.hide = function () {
// 	this.memory.color = this.color;
// 	this.memory.secondaryColor = this.secondaryColor;
// 	this.memory.pos = this.pos;
// 	this.memory.hidden = true;
// 	this.remove();
// }

// // @static
// Flag.prototype.remove2 = function (flagName: string): void {
// 	if (Game.flags[flagName]) {
// 		Game.flags[flagName].remove();
// 	}
// 	if (Memory.flags[flagName]) {
// 		delete Memory.flags[flagName];
// 	}
// }

// // @static
// Flag.prototype.show = function (flagName: string): void {
// 	let memory = Memory.flags[flagName];
// 	if (!memory || !memory.hidden) {
// 		log.e(`Failed to show flag [${memory.name}] because it has no memory or is not hidden`);
// 		return;
// 	}
// 	let pos = RoomPosition.prototype.fromMemory(memory.pos);
// 	let rv = pos.createFlag(memory.name, memory.color, memory.secondaryColor);
// 	if (isErrorCode(rv)) {
// 		log.e(`Failed to show flag [${memory.name}] with error: [${errorCodeToString(rv)}]`);
// 		return;
// 	}
// 	memory.hidden = false;
// }

// export function getFlagPos (flagName: string): RoomPosition {
// 	let flag = Game.flags[name];
// 	if (flag) {
// 		return flag.pos;
// 	}
// 	let memory = Memory.flags[name];
// 	if (memory && memory.pos) {
// 		return RoomPosition.prototype.fromMemory(memory.pos);
// 	}
// 	return null;
// }

// export function getFlagMemory(flagName: string): FlagMemory {
// 	return MemInit(Memory.flags, flagName, {});
// }
