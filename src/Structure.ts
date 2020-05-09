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

export function filterStructureType<T extends StructureConstant>(structures: AnyStructure[], type: T): ConcreteStructure<T>[] {
	return structures.filter(s => s.structureType == type) as ConcreteStructure<T>[];
}

export function isSpawnOrExtension(s: any): s is StructureSpawn | StructureExtension {
	return s instanceof StructureSpawn || s instanceof StructureExtension;
}

export function isRoad(s: any): s is StructureRoad | ConstructionSite<STRUCTURE_ROAD> {
	return s instanceof StructureRoad || (s instanceof ConstructionSite && s.structureType == STRUCTURE_ROAD);
}

export function isContainer(s: any): s is StructureContainer | ConstructionSite<STRUCTURE_CONTAINER> {
	return s instanceof StructureContainer || (s instanceof ConstructionSite && s.structureType == STRUCTURE_CONTAINER);
}
