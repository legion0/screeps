declare namespace NodeJS {
	interface Global {
		_: any;
		MemInit(o: object, name: string, value: any): void;
	}
}
