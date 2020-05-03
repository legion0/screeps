import _ from "lodash";

let deprecatedShown = [];

class Register {
	_useNewPathFinder = true;
	_objects = {};
	byRoom: { [ket: string]: any };
	findCache: { [key: string]: any };
	rooms: any[] = [];
	roomEventLogCache = {};
	objectsByRoom: { [key: string]: {} };
	objectsByRoomKeys: {};

	flags: Flag[];
	spawns: StructureSpawn[];
	constructionSites: ConstructionSite[];
	map: any;
	powerCreeps: { [key: string]: PowerCreep };
	creeps: { [key: string]: Creep };
	structures: { [key: string]: Structure };
	ownedStructures: { [key: string]: OwnedStructure };
	sources: { [key: string]: Source };
	minerals: { [key: string]: Mineral };
	deposits: { [key: string]: Deposit };
	energy: { [key: string]: any/*Energy*/ };
	market: Market;

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
