import { Role, roleRegister } from './Role';
import { findObjectByPos, findObjectInRoom } from './prototype.RoomPosition';

declare global {
	interface CreepMemory {
		// The target room to boot, set at creation time.
		jobId: string;
		flagName: string;
		sourceOid: Id<Source>;
		containerOid: Id<StructureContainer>;
		spawnOid: Id<StructureSpawn>;
	}
}

function isConcreteStructure<T extends StructureConstant>(s: any, type: T): s is ConcreteStructure<T> {
	return s.structureType == type;
}

class RoleBoot extends Role {
	static className = 'RoleBoot';
	
	private getJob() {

	}

	run() { }

	private findSource() {
		return findObjectByPos<Source>(
			Flag.prototype.getPos(this.creep.memory.flagName),
			/*cacheReader=*/() => this.creep.memory.sourceOid,
			/*cacheWriter=*/(id) => this.creep.memory.sourceOid = id,
			/*findCallback=*/() => Flag.prototype.getPos(this.creep.memory.flagName).findClosestByRange(FIND_SOURCES));
	}

	// private findContainer() {
	// 	let container = findObjectByPos<StructureContainer>(
	// 		Flag.prototype.getPos(this.creep.memory.flagName),
	// 		/*cacheReader=*/() => this.creep.memory.containerOid,
	// 		/*cacheWriter=*/(id) => this.creep.memory.containerOid = id,
	// 		/*findCallback=*/() => Flag.prototype.getPos(this.creep.memory.flagName)
	// 			.lookNear(LOOK_STRUCTURES, s => isConcreteStructure(s, STRUCTURE_CONTAINER))
	// 			.first() as StructureContainer);
	// }

	private findSpawn(includeFull = false) {
		let spawn = findObjectInRoom(
			this.creep.memory.roomName,
				/*cacheReader=*/() => this.creep.memory.spawnOid,
				/*cacheWriter=*/(id) => this.creep.memory.spawnOid = id,
				/*findCallback=*/(room) => room.find(FIND_MY_SPAWNS).first()
		);
		return includeFull || spawn.energy < spawn.energyCapacity ? spawn : null;
	}

	findExtensions() {
		let extensions = findObjectsInRoom(
			this.creep.memory.roomName,
			/*cacheReader=*/() => this.creep.memory.entensionsOid,
				/*cacheWriter=*/(id) => this.creep.memory.spawnOid = id,
				/*findCallback=*/(room) => room.find(FIND_MY_SPAWNS).first()
		);
		let extension = this.findSpawn().findClosestByRange(FIND_MY_STRUCTURES, { filter: s => s.structureType == STRUCTURE_EXTENSION && s.energy < s.energyCapacity });

	}
if (extension) {
	return extension;
}
	}

return this._get_container();
	}

isValidSource(source) {
	return source == this._get_flagPos();
}

isValidTarget(target) {
	return target.structureType == STRUCTURE_SPAWN && target.energy < target.energyCapacity ||
		target.structureType == STRUCTURE_CONTAINER && target.progress < target.progressTotal ||
		target.structureType == STRUCTURE_CONTAINER && _.sum(target.store) < target.storeCapacity;
}

selectAction(old_action) {
	if (old_action && _.sum(this.creep.carry) == 0) {
		return false;
	} else if (!old_action && _.sum(this.creep.carry) == this.creep.carryCapacity) {
		return true;
	}
	return old_action;
}

innerAction(target) {
	// this.target = this.findTarget();
	if (target instanceof ConstructionSite) {
		return this.creep.build(target);
	} else {
		let transfer_res = this.creep.transfer(target, RESOURCE_ENERGY);
		if (transfer_res == ERR_FULL) {
			return OK;
		}
		return transfer_res;
	}
}

_get_source() {
	let pos = this._get_flagPos();
	if (!pos) {
		return null;
	}
	let source;
	if (this.memory.actual_source) {
		source = Game.getObjectById(this.memory.actual_source);
	}
	if (!source || !source.pos.isNearTo(pos)) {
		source = pos.findClosestByRange(FIND_SOURCES);
		this.memory.actual_source = source ? source.id : null;
	}
	return source;
}

_get_container() {
	let pos = this._get_flagPos();
	if (!pos) {
		return null;
	}
	let container;
	if (this.memory.container) {
		container = Game.getObjectById(this.memory.container);
	}
	if (!container || !container.pos.isEqualTo(pos)) {
		let source = this._get_source();
		container = source ? source.get_container() : null;
		this.memory.container = container ? container.id : null;
	}
	if (container && container.store && container.store.energy == container.storeCapacity) {
		this.creep.recycle();
	}
	return container;
}

innerHarvest() {
	let source = this._get_source();
	let ret_val = this.creep.harvest(source);
	if (ret_val == ERR_NOT_ENOUGH_ENERGY && this.pos.getRangeTo(source) > source.ticksToRegeneration) {
		ret_val = ERR_NOT_IN_RANGE;
	}
	return ret_val;
}

onCannotReaquireTarget() {
	// this.log('onCannotReaquireTarget');
}
onCannotReaquireSource() {
	// this.log('onCannotReaquireSource');
}

onNoPathToSource(source) {
	// this.log('onNoPathToSource');
}
onNoPathToTarget(target) {
	// this.log('onNoPathToTarget');
}
}

Boot.ROLE = 'BOOT';
Boot.EXECUTION_PRIORITY = 130;
Boot.SPAWN_PRIORITY = SPAWN_PRIORITY_URGENT;
Boot.BODY_PARTS = [WORK, WORK, CARRY, MOVE];

RoleFactory.register_role(Boot.ROLE, Boot);

module.exports = Boot;

roleRegister.registerRole(RoleBoot);
