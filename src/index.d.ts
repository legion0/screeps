interface Registerable<T> {
	className: Id<T>;
}

interface MemoryFor<T> { }

interface ObjectWithId<T> {
	id: Id<T>;
}
