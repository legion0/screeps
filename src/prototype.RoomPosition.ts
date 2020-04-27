import { isWalkableStructure } from "./util.Structure";

declare global {
	interface RoomPositionMemory extends String {}

	interface RoomPosition {
		key(): string;
		isWalkable(): boolean;
		fromMemory(roomPositionMemory: RoomPositionMemory): RoomPosition;
		toMemory(): RoomPositionMemory;
		closest(positions: RoomPosition[]) : RoomPosition;
	}
}

RoomPosition.prototype.key = function (): string {
	return this.roomName + '_' + this.x + '_' + this.y;
};

RoomPosition.prototype.isWalkable = function (): boolean {
	return RoomPosition.prototype.lookFor(LOOK_STRUCTURES).every(structure => isWalkableStructure(structure));
}

// @static
RoomPosition.prototype.fromMemory = function (memory: RoomPositionMemory): RoomPosition {
	let x = Number(_.trimStart(memory.slice(0, 2), '0'));
	let y = Number(_.trimStart(memory.slice(2, 4), '0'));
	let roomName = memory.slice(4, memory.length);
	return new RoomPosition(x, y, roomName);
}

RoomPosition.prototype.toMemory = function (): RoomPositionMemory {
	return _.padStart(this.x, 2, '0') + _.padStart(this.y, 2, '0') + this.roomName;
}

RoomPosition.prototype.closest = function(positions: RoomPosition[]): RoomPosition {
	return positions.reduce((best, current) => current.getRangeTo(this) < best.getRangeTo(this) ? current: best, positions.first());
}
