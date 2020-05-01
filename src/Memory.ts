export function MemInit(o: object, name: string, value: any): any {
	if (o[name] === undefined) {
		o[name] = value;
	}
	return o[name];
}
