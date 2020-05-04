// moved to utils in order to avoid circulat deps since this is a very common function
export function MemInit(o: object, name: string, value: any): any {
	if (o[name] === undefined) {
		o[name] = value;
	}
	return o[name];
}
