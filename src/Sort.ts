interface CompareFunc<T> {
	(lhs: T, rhs: T): number;
}

interface KeyFunc<T> {
	(o: T): number;
}

export function less(a: number, b: number) {
	return a - b;
}

export function greater(a: number, b: number) {
	return b - a;
}

export function sortByKey<T>(keyFunc: KeyFunc<T>, compareFunc: CompareFunc<number> = less): CompareFunc<T> {
	return (lhs: T, rhs: T) => compareFunc(keyFunc(lhs), keyFunc(rhs));
}

export function property<T, K extends keyof T>(propName: K): (obj: T) => T[K] {
	return (obj: T) => obj[propName];
}

export function sortByProperty<T extends Record<K, number>, K extends keyof T>(propName: K, compareFunc: CompareFunc<number> = less) {
	return sortByKey<T>(property(propName), compareFunc);
}

export function chainComparators(...comparators: CompareFunc<unknown>[]) {
	return (lhs: unknown, rhs: unknown) => {
		for (let comparator of comparators) {
			let val = comparator(lhs, rhs);
			if (val != 0) {
				return val;
			}
		}
		return 0;
	};
}
