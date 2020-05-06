export function MemInit<T>(o: T, name: keyof T, value: any): any {
	if (o[name] === undefined) {
		o[name] = value;
	}
	return o[name];
}
