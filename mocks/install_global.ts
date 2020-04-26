import { PathFinder } from "./PathFinder";
import { Memory } from "./Memory";
import { RoomPosition } from "./RoomPosition";
import { Game } from "./Game";
import { C } from './constants';

(global as any).PathFinder = PathFinder;
(global as any).Memory = Memory;
(global as any).RoomPosition = RoomPosition;
(global as any).Game = Game;

for (let prop of Object.keys(C)) {
	global[prop] = C[prop];
}
