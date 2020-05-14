// import { Highway } from "./Highway";

// import { MemInit } from "./Memory";
// import { fromMemoryWorld } from "./RoomPosition";
// import { Highway } from "./Highway";
// import { moveTo } from "./Action";

// interface HighwayCreepMemory {
// 	path: RoomPosition[];
// }

// declare global {
// 	interface CreepMemory {
// 		highway: HighwayCreepMemory;
// 	}
// }

export function hasTicksToLive(creep: Creep | undefined): creep is HasProperty<Creep, 'ticksToLive'> {
	return creep != null && (creep as any).ticksToLive != null;
}
