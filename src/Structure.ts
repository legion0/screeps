export function isWalkableStructure(structure: Structure<StructureConstant>) {
	switch (structure.structureType) {
		case STRUCTURE_CONTAINER:
		case STRUCTURE_ROAD:
			return true;
		case STRUCTURE_RAMPART:
			return (structure as StructureRampart).my;
		default:
			return false;
	}
}

export function isConcreteStructure<T extends StructureConstant>(s: any, structureType: T): s is ConcreteStructure<T> {
	return s.structureType == structureType;
}

export function isConstructionSiteForStructure<T extends BuildableStructureConstant>(s: any, structureType: T): s is ConstructionSite<T> {
	return s.structureType == structureType;
}

export function isDamaged(target: Structure) {
	return target.hits < target.hitsMax;
}
