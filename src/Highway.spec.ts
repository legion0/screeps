import _ from "lodash";

(global as any)._ = _;

import '../mocks/install_global';
(global as any).StructureSpawn = jest.fn();

import './prototype.All';

import { Highway } from "./Highway";
import { init, generateRoomName } from '../mocks/Driver';
import { roomNameToXY } from '../mocks/utils';
import { Map } from '../mocks/Map';

init(
	/*mod=*/require('@screeps/driver/native/build/Release/native.node'),
	/*rooms=*/Map.decodeTerrainData(require('@screeps/driver/native/sample-terrain.js'))
);

// W0N0
// WW         WWW         WWW          WWW       S  W
// W          WWW         SWWW         WWW         WW
// W          WW          WW           WW WW        W
//   W        W   W        W           W            W
//        W   WW    S     WW            W    S     SW
//      SS    W      S    LW           W       W   WW
//      W     WW          WW          WWW           W
//            W           LW           W           WW
//            WW          WW          WWW S         W
//          WWW           WW           WWW     WWW WW
// WW     WWWWWWW     WW WWWWW    WWWWWWWWW     WWWWW
// WWW    WWWWWWWWW   WWWWWWWWWL  WWWWWWWWWWW WWWWWWW

test('deep', () => {
	let from = new RoomPosition(1, 1, 'W0N0');
	let to = new RoomPosition(5, 6, 'W0N0');
	let highway = new Highway(from as any, to as any).build();

	expect(highway).toBeInstanceOf(Highway);
	expect((highway as Highway).nextSegment(from as any, to as any)).toMatchObject([{ "x": 2, "y": 2 }, { "x": 3, "y": 3 }]);
})
