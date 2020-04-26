import _ from "lodash";

let deprecatedShown = [];

class Register {
	rooms: any[] = [];
	objectsByRoom: { [key: string]: number };
	_useNewPathFinder: boolean = true;
	objectsByRoomKeys: {};
	byRoom: { [ket: string]: any };
	findCache: {[key:string]: any};

	// 	var register = {
	// 	_useNewPathFinder: true,
	// 	_objects: {},
	// 	byRoom: {},
	// 	findCache: {},
	// 	rooms: {},
	// 	roomEventLogCache: {},
	// };


	deprecated(msg: string) {
		if (!_.includes(deprecatedShown, msg)) {
			deprecatedShown.push(msg);
			console.log(msg);
		}
	}

	assertTargetObject(obj) {
		if (obj && _.isPlainObject(obj) && _.isString(obj.id) && obj.id.length == 24) {
			throw new Error("It seems you're trying to use a serialized game object stored in Memory which is not allowed. Please use `Game.getObjectById` to retrieve a live object reference instead.");
		}
	}
}

export let register = new Register();
