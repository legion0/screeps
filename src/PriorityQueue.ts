class PriorityQueue {
	constructor(memory, comparator) {
			this._compare = comparator;
			this._array = memory.array;
			if (memory.index) {
					this._index = memory.index;
			}
			this._memory = memory;
	}

	push(element) {
			// console.log('push start', JSON.stringify([element.name, element.priority]), JSON.stringify(this._array.map(e => [e.name, e.priority])));
			if (this._index) {
					this._index[element.name] = 1;
			}
			let i = this._memory.size;
			this._array[this._memory.size++] = element;
			while (i > 0) {
					if (element.name == 'harvester_9b693a0af897fe1df18e142f') {
							debugger;
					}
					let p = (i - 1) >> 1;
					let ap = this._array[p];
					if(!this._compare(element, ap)) {
							break;
					}
					// console.log('perc up', i, p);
					this._array[i] = ap;
					i = p;
			}
			this._array[i] = element;
			// console.log('push end', JSON.stringify(this._array.map(e => [e.name, e.priority])));
	}
	peek() {
			if (this._memory.size === 0) {
					throw new Error('Cannot peek an empty array');
			}
			return this._array[0];
	}
	pop() {
			// console.log('pop start', JSON.stringify(this._array.map(e => [e.name, e.priority])));
			if (this._memory.size === 0) {
					throw new Error('Cannot pop an empty array');
			}
			let ans = this._array[0];
			if(this._memory.size > 1) {
					this._array[0] = this._array[--this._memory.size];
					this._percolateDown(0);
			} else {
					--this._memory.size;
			}
			if (this._index) {
					delete this._index[ans.name];
			}
			// console.log('pop end', JSON.stringify([ans.name, ans.priority]), JSON.stringify(this._array.slice(0, this._memory.size).map(e => [e.name, e.priority])));
			return ans;
	}
	trim() {
			this._array.splice(this._memory.size);
	}
	isEmpty() {
			return this._memory.size === 0;
	}
	size() {
			return this._memory.size;
	}
	hasName(name) {
			if (!this._index) {
					throw new Error('This PriorityQueue has no index');
			}
			return hasOwnProperty.call(this._index, name);
	}

	static create(opt_with_index) {
			let memory = {
					'size': 0,
					'array': [],
			};
			if (opt_with_index === true) {
					memory.index = {};
			}
			return memory;
	}
	static load(memory, comparator) {
			return new PriorityQueue(memory, comparator);
	}

	_percolateUp(i) {
			let myval = this._array[i];
			while (i > 0) {
					let p = (i - 1) >> 1;
					let ap = this._array[p];
					if(!this._compare(myval, ap)) {
							break;
					}
					this._array[i] = ap;
					i = p;
			}
			this._array[i] = myval;
	}
	_percolateDown(i) {
			let size = this._memory.size;
			let hsize = size >>> 1;
			let ai = this._array[i];
			while (i < hsize) {
					let l = (i << 1) + 1;
					let r = l + 1;
					// console.log(i, l, r, JSON.stringify(this._array));
					let bestc = this._array[l];
					if (r < size) {
							if (this._compare(this._array[r], bestc)) {
									// console.log('right swap');
									l = r;
									bestc = this._array[r];
							}
					}
					if (!this._compare(bestc, ai)) {
						break;
					}
					// console.log('left swap');
					this._array[i] = bestc;
					i = l;
			}
			this._array[i] = ai;
	}
}

module.exports = PriorityQueue;