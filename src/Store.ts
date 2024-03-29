import { log } from './Logger';

export type ObjectWithEnergy = Source | StructureSpawn | StructureExtension;
export function isObjectWithEnergy(o: any): o is ObjectWithEnergy {
	return o instanceof Source ||
		o instanceof StructureSpawn ||
		o instanceof StructureExtension;
}

export type ObjectWithStore = StructureContainer | Tombstone | Ruin | Creep | StructureTower | StructureStorage;
export function isObjectWithStore(o: any): o is ObjectWithStore {
	return o instanceof StructureContainer ||
		o instanceof Tombstone ||
		o instanceof Ruin ||
		o instanceof Creep ||
		o instanceof StructureTower ||
		o instanceof StructureStorage;
}

export type ObjectWithAmount = Resource;
export function isObjectWithAmount(o: any): o is ObjectWithAmount {
	return o instanceof Resource;
}

export function getUsedCapacity(
	target: ObjectWithStore | ObjectWithEnergy | ObjectWithAmount, resource: ResourceConstant = RESOURCE_ENERGY
): number {
	if (isObjectWithStore(target)) {
		if (target instanceof StructureTower) {
			return resource === RESOURCE_ENERGY ? target.store.getUsedCapacity(resource) : 0;
		}
		return target.store.getUsedCapacity(resource);
	} else if (isObjectWithEnergy(target)) {
		return target.energy;
	} else if (isObjectWithAmount(target)) {
		return target.amount;
	}
	log.e(`Invalid target for getUsedCapacity [${target}] [${resource}]`);
	return 0;
}

export function hasUsedCapacity(
	target: ObjectWithStore | ObjectWithEnergy | ObjectWithAmount, resource: ResourceConstant = RESOURCE_ENERGY
): boolean {
	return getUsedCapacity(target, resource) > 0;
}

export function getFreeCapacity(
	target: ObjectWithStore | ObjectWithEnergy, resource: ResourceConstant = RESOURCE_ENERGY
): number {
	if (isObjectWithStore(target)) {
		if (target instanceof StructureTower) {
			return resource === RESOURCE_ENERGY ? target.store.getFreeCapacity(resource) : 0;
		}
		return target.store.getFreeCapacity(resource);
	} else if (isObjectWithEnergy(target)) {
		return target.energyCapacity - target.energy;
	}
	log.e(`Invalid target for getFreeCapacity [${target}] [${resource}]`);
	return 0;
}

export function hasFreeCapacity(
	target: ObjectWithEnergy | ObjectWithStore, resource: ResourceConstant = RESOURCE_ENERGY
): boolean {
	return getFreeCapacity(target, resource) > 0;
}

export function getCapacity(
	target: ObjectWithStore | ObjectWithEnergy | ObjectWithAmount, resource: ResourceConstant = RESOURCE_ENERGY
): number {
	if (isObjectWithStore(target)) {
		if (target instanceof StructureTower) {
			return resource === RESOURCE_ENERGY ? target.store.getCapacity(resource) : 0;
		} else if ((target instanceof Ruin) || (target instanceof Tombstone)) {
			return target.store.getCapacity(resource);
		} else {
			return target.store.getCapacity(resource);
		}
	} else if (isObjectWithEnergy(target)) {
		return target.energyCapacity;
	} else if (isObjectWithAmount(target)) {
		return target.amount;
	}
	log.e(`Invalid target for getUsedCapacity [${target}] [${resource}]`);
	return 0;
}

export function getCapacityLoad(
	target: ObjectWithEnergy | ObjectWithStore, resource: ResourceConstant = RESOURCE_ENERGY
): number {
	const capacity = getCapacity(target, resource);
	return getUsedCapacity(target, resource) / capacity;
}
