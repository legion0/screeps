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

export function getUsedCapacity(target: ObjectWithEnergy | ObjectWithStore | ObjectWithAmount, resourceType: ResourceConstant = RESOURCE_ENERGY): number {
	if (isObjectWithStore(target)) {
		return target instanceof StructureTower ? target.store.getUsedCapacity(resourceType) : target.store.getUsedCapacity(resourceType);
	} else if (isObjectWithAmount(target)) {
		return target.amount;
	} else if (isObjectWithEnergy(target)) {
		return target.energy;
	}
	return 0;
}

export function hasUsedCapacity(target: ObjectWithEnergy | ObjectWithStore | ObjectWithAmount, resourceType: ResourceConstant = RESOURCE_ENERGY) {
	return getUsedCapacity(target, resourceType) > 0;
}

export function getFreeCapacity(target: ObjectWithEnergy | ObjectWithStore, resourceType: ResourceConstant = RESOURCE_ENERGY) {
	if (isObjectWithStore(target)) {
		return target instanceof StructureTower ? target.store.getFreeCapacity(resourceType) : target.store.getFreeCapacity(resourceType);
	} else if (isObjectWithEnergy(target)) {
		return target.energyCapacity - target.energy;
	}
	return 0;
}

export function hasFreeCapacity(target: ObjectWithEnergy | ObjectWithStore, resourceType: ResourceConstant = RESOURCE_ENERGY) {
	return getFreeCapacity(target, resourceType) > 0;
}
