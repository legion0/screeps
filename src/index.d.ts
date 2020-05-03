interface Registerable {
	className: string;
}

interface MemoryFor<T> { }

interface ObjectWithId<T> {
	id: Id<T>;
}
