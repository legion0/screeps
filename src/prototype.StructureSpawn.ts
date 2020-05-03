// import { log } from './Logger';
// import { MemInit } from './Memory';

// declare global {
// 	interface StructureSpawn {
// 		spawnCreep2(body: BodyPartConstant[], name: string, opts?: SpawnOptions): ScreepsReturnCode;
// 		toString2(): string;
// 	}
// }

// StructureSpawn.prototype.spawnCreep2 = function (body: BodyPartConstant[], name: string, opts?: SpawnOptions): ScreepsReturnCode {
// 	MemInit(this.memory, 'last_spawn_start_time', -1);

// 	if (this.memory.last_spawn_start_time == Game.time) {
// 		return ERR_BUSY;
// 	}

// 	let optsCopy = opts == null ? {} : _.cloneDeep(opts);
// 	MemInit(optsCopy, 'memory', {});
// 	_.assign(optsCopy.memory, {
// 		'origin_spawn': this.id,
// 		'origin_room': this.room.name,
// 	});

// 	let ret_val = this.spawnCreep(body, name, optsCopy);
// 	if (ret_val == OK) {
// 		let bodySummary = _.countBy(body);
// 		let price = _.sum(body.map(part => BODYPART_COST[part]));
// 		this.memory.last_spawn_data = {
// 			'name': name,
// 			'body': bodySummary,
// 			'size': body.length,
// 			'price': price,
// 			'opts': optsCopy,
// 		};
// 		log.i(this, 'Spawning:', name, bodySummary, body.length, price, optsCopy);
// 		this.memory.last_spawn_start_time = Game.time;
// 	}
// 	return ret_val;
// };

// StructureSpawn.prototype.toString2 = function () {
// 	return '[spawn ' + this.name + ' ' + this.pos.key() + ']';
// };
