export class CostMatrix {
	private _bits = new Uint8Array(2500);

	set(xx, yy, val) {
		xx = xx | 0;
		yy = yy | 0;
		this._bits[xx * 50 + yy] = Math.min(Math.max(0, val), 255);
	}

	get(xx, yy) {
		xx = xx | 0;
		yy = yy | 0;
		return this._bits[xx * 50 + yy];
	}

	clone() {
		var newMatrix = new CostMatrix;
		newMatrix._bits = new Uint8Array(this._bits);
		return newMatrix;
	}

	serialize() {
		return Array.prototype.slice.apply(new Uint32Array(this._bits.buffer));
	}

	static deserialize(data) {
		let instance = Object.create(CostMatrix.prototype);
		instance._bits = new Uint8Array(new Uint32Array(data).buffer);
		return instance;
	}
}
