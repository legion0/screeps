export function MemInit<T, K extends keyof T>(o: T, name: K, value: any): T[K] {
	if (o[name] === undefined) {
		o[name] = value;
	}
	return o[name];
}
