export function MemInit<T, K extends keyof T>(o: T, name: K, value: Exclude<T[K], undefined>): Exclude<T[K], undefined> {
	if (o[name] === undefined) {
		o[name] = value;
	}
	return o[name] as Exclude<T[K], undefined>;
}
