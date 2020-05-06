interface Registerable<T> {
	className: Id<T>;
}

interface MemoryFor<T> { }

interface ObjectWithId<T> {
	id: Id<T>;
}

type ObjectWithStore = { store: StoreDefinition };
type ObjectWithEnergy = ObjectWithStore | { energy: number, energyCapacity: number };

type ObjectWithPos = { pos: RoomPosition };
