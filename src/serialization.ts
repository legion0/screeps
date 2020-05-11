export function encode(val: any): ArrayBuffer {
	let buffers: ArrayBuffer[] = [];
	encodeR(val, buffers);
	let byteLength = buffers.reduce((total, buffer) => total + buffer.byteLength, 0);
	let res = new Uint8Array(byteLength);
	let offset = 0;
	for (let buffer of buffers) {
		res.set(new Uint8Array(buffer), offset);
		offset += buffer.byteLength;
	}
	return res.buffer;
}

export function decode(buffer: ArrayBuffer) {
	let offset = { i: 0 };
	return decodeR(new DataView(buffer), offset);
}

enum Type {
	UNKNOWN,  // sentinel
	UNDEFINED,
	NULL,
	BOOLEAN,
	INTEGER,
	FLOAT,
	STRING,
	ARRAY,
	OBJECT,
}

const ORDER = [
	Type.UNDEFINED,
	Type.NULL,
	Type.BOOLEAN,
	Type.INTEGER,
	Type.FLOAT,
	Type.STRING,
	Type.ARRAY,
	Type.OBJECT,
];

function writeInt64ToBuffer(val: number, buffer: DataView, offset: number) {
	let left = val / (2 ** 32);
	let right = val % (2 ** 32);
	buffer.setUint32(offset, left);
	buffer.setUint32(offset + 4, right);
	return buffer;
}

function getInt64(buffer: DataView, offset: number) {
	const left = buffer.getUint32(offset);
	const right = buffer.getUint32(offset + 4);
	return left * (2 ** 32) + right;
}

// create a new buffer of size, wrap with DataView and set the first byte to
// the data type for serialization.
function newBuffer(type: Type, size: number) {
	let buffer = new DataView(new ArrayBuffer(size));
	buffer.setUint8(0, type);
	return buffer;
}

function decodeTestForType(type: Type) {
	return function (buffer: DataView, offset: { i: number; }) {
		return buffer.getUint8(offset.i) == type;
	}
}

const SPEC = {
	[Type.STRING]: {
		encodeTest: (val: any) => typeof val == 'string' || val instanceof String,
		encode: (val: string | String, buffers: ArrayBuffer[]) => {
			let buffer = newBuffer(Type.STRING, 9 + val.length * 4);
			writeInt64ToBuffer(val.length, buffer, 1);
			let offset = 9;
			for (let codePoint of val) {
				buffer.setUint32(offset, codePoint.codePointAt(0)!);
				offset += 4;
			}
			buffers.push(buffer.buffer);
		},
		decodeTest: decodeTestForType(Type.STRING),
		decode: (buffer: DataView, offset: { i: number; }) => {
			let size = getInt64(buffer, offset.i);
			offset.i += 8;
			let res = '';
			for (let i = 0; i < size; i++) {
				res += String.fromCodePoint(buffer.getUint32(offset.i));
				offset.i += 4;
			}
			return res;
		},
	},
	[Type.INTEGER]: {
		encodeTest: (val: any) => (typeof val == 'number' || val instanceof Number) && (val as number % 1 === 0),
		encode: (val: number | Number, buffers: ArrayBuffer[]) => {
			let buffer = newBuffer(Type.INTEGER, 9);
			writeInt64ToBuffer(val as number, buffer, 1);
			buffers.push(buffer.buffer);
		},
		decodeTest: decodeTestForType(Type.INTEGER),
		decode: (buffer: DataView, offset: { i: number; }) => {
			let res = getInt64(buffer, offset.i);
			offset.i += 8;
			return res;
		},
	},
	[Type.FLOAT]: {
		encodeTest: (val: any) => (typeof val == 'number' || val instanceof Number) && (val as number % 1 !== 0),
		encode: (val: number | Number, buffers: ArrayBuffer[]) => {
			let buffer = newBuffer(Type.FLOAT, 9);
			buffer.setFloat64(1, val as number);
			buffers.push(buffer.buffer);
		},
		decodeTest: decodeTestForType(Type.FLOAT),
		decode: (buffer: DataView, offset: { i: number; }) => {
			let res = buffer.getFloat64(offset.i);
			offset.i += 8;
			return res;
		},
	},
	[Type.BOOLEAN]: {
		encodeTest: (val: any) => typeof val == 'boolean' || val instanceof Boolean,
		encode: (val: boolean | Boolean, buffers: ArrayBuffer[]) => {
			let buffer = newBuffer(Type.BOOLEAN, 2);
			buffer.setUint8(1, Number(val));
			buffers.push(buffer.buffer);
		},
		decodeTest: decodeTestForType(Type.BOOLEAN),
		decode: (buffer: DataView, offset: { i: number; }) => {
			return Boolean(buffer.getUint8(offset.i++));
		},
	},
	[Type.NULL]: {
		encodeTest: (val: any) => val === null,
		encode: (val: null, buffers: ArrayBuffer[]) => {
			buffers.push(newBuffer(Type.NULL, 1).buffer);
		},
		decodeTest: decodeTestForType(Type.NULL),
		decode: (buffer: DataView, offset: { i: number; }) => {
			return null;
		},
	},
	[Type.UNDEFINED]: {
		encodeTest: (val: any) => val === undefined,
		encode: (val: undefined, buffers: ArrayBuffer[]) => {
			buffers.push(newBuffer(Type.UNDEFINED, 1).buffer);
		},
		decodeTest: decodeTestForType(Type.UNDEFINED),
		decode: (buffer: DataView, offset: { i: number; }) => {
			return undefined;
		},
	},
	[Type.ARRAY]: {
		encodeTest: (val: any) => val instanceof Array,
		encode: (val: any[], buffers: ArrayBuffer[]) => {
			let buffer = newBuffer(Type.ARRAY, 9);
			writeInt64ToBuffer(val.length, buffer, 1);
			buffers.push(buffer.buffer);
			for (let item of val) {
				encodeR(item, buffers);
			}
		},
		decodeTest: decodeTestForType(Type.ARRAY),
		decode: (buffer: DataView, offset: { i: number; }) => {
			let size = getInt64(buffer, offset.i);
			offset.i += 8;
			let arr: any[] = [];
			for (let i = 0; i < size; i++) {
				arr.push(decodeR(buffer, offset));
			}
			return arr;
		},
	},
	[Type.OBJECT]: {
		encodeTest: (val: any) => typeof val == 'object' || val instanceof Object,
		encode: (val: object, buffers: ArrayBuffer[]) => {
			let keys = Object.keys(val);

			let buffer = newBuffer(Type.OBJECT, 9);
			writeInt64ToBuffer(keys.length, buffer, 1);
			buffers.push(buffer.buffer);
			for (let key of keys) {
				encodeR(key, buffers);
				encodeR(val[key], buffers);
			}
		},
		decodeTest: decodeTestForType(Type.OBJECT),
		decode: (buffer: DataView, offset: { i: number; }) => {
			let size = getInt64(buffer, offset.i);
			offset.i += 8;
			let res = {};
			for (let i = 0; i < size; i++) {
				let key = decodeR(buffer, offset);
				let val = decodeR(buffer, offset);
				res[key] = val;
			}
			return res;
		},
	},
};

function encodeR(val: any, buffer: ArrayBuffer[]) {
	for (let type of ORDER) {
		if (SPEC[type].encodeTest(val)) {
			SPEC[type].encode(val, buffer);
			break;
		}
	}
}

function decodeR(buffer: DataView, offset: { i: number; }) {
	for (let type of ORDER) {
		if (SPEC[type].decodeTest(buffer, offset)) {
			offset.i++;
			return SPEC[type].decode(buffer, offset);
		}
	}
}

export function packAsString(buffer: ArrayBuffer): string {
	return String.fromCharCode.apply(null, new Uint16Array(buffer));
}

export function unpackString(str: string): ArrayBuffer {
	let buffer = new Uint16Array(str.length);
	for(var i = 0; i < str.length; i++) {
		buffer[i] = str.charCodeAt(i);
	}
	return buffer.buffer;
}
