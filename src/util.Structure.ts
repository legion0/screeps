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
