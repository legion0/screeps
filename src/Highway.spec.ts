// import _ from "lodash";
let _ = require('lodash');

(global as any)._ = _;

import '../mocks/install_global';
(global as any).StructureSpawn = jest.fn();

import './prototype.All';

import { Highway } from "./Highway";
import { initFromSample } from '../mocks/Driver';

initFromSample(
	/*mod=*/require('@screeps/driver/native/build/Release/native.node'),
	/*rooms=*/require('@screeps/driver/native/sample-terrain.js')
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
	const from = new RoomPosition(1, 1, 'W0N0');
	const to = new RoomPosition(5, 9, 'W0N0');
	const highway = Highway.createHighway(from as any, to as any);

	expect(highway).toBeInstanceOf(Highway);
	expect((highway as Highway).nextSegment(from, to)).toMatchObject([{ "x": 2, "y": 2 }, { "x": 3, "y": 3 }]);
});
