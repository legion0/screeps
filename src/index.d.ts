interface Registerable<T> {
	className: Id<T>;
}

interface MemoryFor<T> { }

interface ObjectWithId<T> {
	id: Id<T>;
}

// type HasProperty<T, K> = Exclude<T, K> & ;

// type HasProperty<T, K extends keyof T> = Exclude<T, K> & Required<Pick<T, K>>;

// type HasProperty<T, K extends keyof T> = Exclude<T, K> & {
// 	[P in K]-?: Exclude<T[P], undefined>;
// };

type HasPropertyOfType<T, K extends keyof T, X> = Exclude<T, K> & {
	[P in K]-?: X;
};

type HasProperty<T, K extends keyof T> = HasPropertyOfType<T, K, Exclude<T[K], undefined>>;
