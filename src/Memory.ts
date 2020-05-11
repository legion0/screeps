export function MemInit<T, K extends keyof T>(o: T, name: K, value: NonNullable<any>): NonNullable<T[K]> {
	if (o[name] === undefined) {
		o[name] = value;
	}
	return o[name] as NonNullable<T[K]>;
}
