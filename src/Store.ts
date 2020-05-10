export function getUsedCapacity(target: ObjectWithEnergy, resourceType: ResourceConstant = RESOURCE_ENERGY): number {
	if ('store' in target) {
		return target.store.getUsedCapacity(resourceType)
	} else if (target instanceof Resource) {
		return target.amount;
	} else {
		return target.energy;
	}
}

export function hasUsedCapacity(target: ObjectWithEnergy, resourceType: ResourceConstant = RESOURCE_ENERGY) {
	return getUsedCapacity(target, resourceType) > 0;
}

export function getFreeCapacity(target: ObjectWithEnergy, resourceType: ResourceConstant = RESOURCE_ENERGY) {
	if ('store' in target) {
		return target.store.getFreeCapacity(resourceType)
	} else if (target instanceof Resource) {
		return 0;  // or +Inf ? does not matter much hopefully
	} else {
		return target.energyCapacity - target.energy;
	}
}

export function hasFreeCapacity(target: ObjectWithEnergy, resourceType: ResourceConstant = RESOURCE_ENERGY) {
	return getFreeCapacity(target, resourceType) > 0;
}
