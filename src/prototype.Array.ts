declare global {
	interface Array<T> {
		first(): T;
		last(): T;
		empty(): boolean;
		size(): number;
		findMinIndex<T>(this: T[], predicate: (value: T) => unknown): number;
	}
}

Array.prototype.last = function <T>(this: T[]): T {
	return this.length != 0 ? this[this.length - 1] : undefined;
};

Array.prototype.first = function <T>(this: T[]): T {
	return this.length != 0 ? this[0] : undefined;
};

Array.prototype.empty = function <T>(this: T[]): boolean {
	return this.length == 0;
};

Array.prototype.size = function <T>(this: T[]): number {
	return this.length;
};

Array.prototype.findMinIndex = function <T>(this: T[], predicate: (value: T) => unknown): number {
	if (this.empty()) {
		return -1;
	}
	let minValue = predicate(this[0]);
	let minIdx = 0;
	for (let i = 1; i < this.size(); i++) {
		let currentValue = predicate(this[i]);
		if (currentValue < minValue) {
			minValue = currentValue;
			minIdx = i;
		}
	}
	return minIdx;
}

export { }
