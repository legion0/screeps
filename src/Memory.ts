function MemInit(o: object, name: string, value: any): void {
	if (o[name] === undefined) {
		o[name] = value;
	}
};

global.MemInit = MemInit;
