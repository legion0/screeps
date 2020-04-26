import { Highway } from "./Highway";

declare global {
	interface Creep {
		walkHighway(from: RoomPosition, to: RoomPosition) : ERR_FULL | ReturnType<typeof Creep.prototype.move> | ReturnType<typeof Creep.prototype.moveTo>;
	}
}

interface HighwayCreepMemory {
	path: RoomPosition[];
}

declare global {
	interface CreepMemory {
		highway: HighwayCreepMemory;
	}
}

Creep.prototype.walkHighway = function (from: RoomPosition, to: RoomPosition): ERR_FULL | ReturnType<typeof Creep.prototype.move> | ReturnType<typeof Creep.prototype.moveTo> {
	let path: RoomPosition[] = MemInit(this.memory, 'highway', { path: [] })
		.path
		.map(RoomPosition.prototype.fromMemory);
	if (!path.empty() && path.first().isEqualTo(this.pos)) {
		path.shift();
	}
	if (path.empty()) {
		path = new Highway(from, to).nextSegment(this.pos, to);
		if (path.empty()) {
			return ERR_FULL;
		}
	}
	// TODO: handle getting stuck
	let next = path.first();
	if (this.pos.isNearTo(next)) {
		return this.move(this.pos.getDirectionTo(next));
	} else {
		return this.moveTo(next);
	}
}
