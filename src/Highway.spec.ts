(global as any)._ = require('lodash');

import '../mocks/install_global';
(global as any).StructureSpawn = jest.fn();

import './prototype.All';

import { Highway } from "./Highway";
import { init } from '../mocks/Driver';
import { roomNameToXY } from '../mocks/utils';

let terrain = require('@screeps/driver/native/sample-terrain.js');
function terrainToRooms(terrainData) {
	let rooms = [];

	// let bit = Number(terrain[yy * 50 + xx]);
	// pack[ii / 4 | 0] = pack[ii / 4 | 0] & ~(0x03 << ii % 4 * 2) | bit << ii % 4 * 2;

	for (let room of terrainData) {
		console.log(room.bits.length);
		rooms.push({
			room: room.room,
			terrain: room.bits
		});
	}
	// room.terrain
	// roomNameToXY.room
}
init(
	/*mod=*/require('@screeps/driver/native/build/Release/native.node'),
	/*rooms=*/terrainToRooms(terrain)
);

test('deep', () => {
	let from = new RoomPosition(1, 1, 'W0N0');
	let to = new RoomPosition(5, 6, 'W0N0');
	let highway = new Highway(from as any, to as any).build();

	expect(highway).toBeInstanceOf(Highway);
	expect((highway as Highway).nextSegment(from as any, to as any)).toMatchObject([{ "x": 2, "y": 2 }, { "x": 3, "y": 3 }]);
})
