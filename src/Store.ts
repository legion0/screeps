export function getUsedCapacity(target: ObjectWithEnergy, resourceType: ResourceConstant = RESOURCE_ENERGY): number {
	return 'store' in target ? target.store.getUsedCapacity(resourceType) : target.energy;
}

export function hasUsedCapacity(target: ObjectWithEnergy, resourceType: ResourceConstant = RESOURCE_ENERGY) {
	return getUsedCapacity(target, resourceType) > 0;
}

export function getFreeCapacity(target: ObjectWithEnergy, resourceType: ResourceConstant = RESOURCE_ENERGY) {
	return 'store' in target ? target.store.getFreeCapacity(resourceType) : (target.energyCapacity - target.energy);
}

export function hasFreeCapacity(target: ObjectWithEnergy, resourceType: ResourceConstant = RESOURCE_ENERGY) {
	return getFreeCapacity(target, resourceType) > 0;
}
