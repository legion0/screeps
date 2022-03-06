interface PriorityQueueMemory<T> {
	array: T[];
	index?: { [key: string]: null; };
	size: number;
}

type KeyFunc<T> = (item: T) => string;
type CompareFunc<T> = (lhs: T, rhs: T) => boolean;

export class PriorityQueue<T> {
	private memory: PriorityQueueMemory<T>;
	private keyFunc?: KeyFunc<T>;
	private compareFunc: CompareFunc<T>;

	private constructor(memory: PriorityQueueMemory<T>, compareFunc: CompareFunc<T>, keyFunc?: KeyFunc<T>) {
		this.memory = memory;
		this.compareFunc = compareFunc;
		this.keyFunc = keyFunc;
	}

	static loadOrCreate<T>(parentMemory, name: string, compareFunc: CompareFunc<T>, keyFunc?: KeyFunc<T>) {
		let memory: PriorityQueueMemory<T> = parentMemory[name];
		if (memory === undefined) {
			memory = parentMemory[name] = { array: [], size: 0 };
			if (keyFunc) {
				memory.index = {};
			}
		}
		return new PriorityQueue<T>(memory, compareFunc, keyFunc);
	}

	push(item: T) {
		if (this.memory.index && this.keyFunc) {
			this.memory.index[this.keyFunc(item)] = null;
		}
		let i = this.memory.size;
		this.memory.array[this.memory.size++] = item;
		while (i > 0) {
			let p = (i - 1) >> 1;
			let ap = this.memory.array[p];
			if (!this.compareFunc(item, ap)) {
				break;
			}
			this.memory.array[i] = ap;
			i = p;
		}
		this.memory.array[i] = item;
	}

	pop() {
		if (this.memory.size < 1) {
			return undefined;
		}
		let ans = this.memory.array[0];
		if (this.memory.size > 1) {
			this.memory.array[0] = this.memory.array[--this.memory.size];
			this.percolateDown(0);
		} else {
			this.memory.size--;
		}
		if (this.memory.index && this.keyFunc) {
			delete this.memory.index[this.keyFunc(ans)];
		}
		return ans;
	}

	peek() {
		return this.memory.array[0];
	}

	isEmpty() {
		return this.memory.size < 1;
	}

	size() {
		return this.memory.size;
	}

	hasItem(key: string) {
		if (!(this.memory.index && this.keyFunc)) {
			throw new Error('This PriorityQueue has no index');
		}
		return key in this.memory.index;
	}

	private percolateDown(i: number) {
		let size = this.memory.size;
		let hsize = size >>> 1;
		let ai = this.memory.array[i];
		while (i < hsize) {
			let l = (i << 1) + 1;
			let r = l + 1;
			let bestc = this.memory.array[l];
			if (r < size) {
				if (this.compareFunc(this.memory.array[r], bestc)) {
					l = r;
					bestc = this.memory.array[r];
				}
			}
			if (!this.compareFunc(bestc, ai)) {
				break;
			}
			this.memory.array[i] = bestc;
			i = l;
		}
		this.memory.array[i] = ai;
	}
}
