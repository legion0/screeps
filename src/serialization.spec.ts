import { encode, decode } from './serialization'

test('float', () => {
	expect(decode(encode(1.7))).toBeCloseTo(1.7, 5);
	expect(decode(encode(0.7))).toBeCloseTo(0.7, 5);
})

test('integer', () => {
	expect(decode(encode(5))).toEqual(5);
	expect(decode(encode(0))).toEqual(0);
})

test('boolean', () => {
	expect(decode(encode(true))).toEqual(true);
	expect(decode(encode(false))).toEqual(false);
})

test('string', () => {
	expect(decode(encode('abc'))).toEqual('abc');
})

test('undefined', () => {
	expect(decode(encode(undefined))).toEqual(undefined);
})

test('null', () => {
	expect(decode(encode(null))).toEqual(null);
})

test('array', () => {
	expect(decode(encode([1, 2, 3]))).toEqual([1, 2, 3]);
})

test('object', () => {
	expect(decode(encode({ a: 'b' }))).toEqual({ a: 'b' });
})

test('complex1', () => {
	let val = {
		arrVal: [1, 2, 3, { key: 'val' }, 'x', null],
		intVal: 5,
		floatVal: 3.7,
		nullVal: null,
		undefinedVal: undefined,
		stringVal: 'abc',
		booleanVal: true,
		objVal: {
			k1: 1,
			k2: 2,
		},
	};
	expect(decode(encode(val))).toEqual(val);
	expect(JSON.stringify(decode(encode(val)))).toEqual(JSON.stringify(val));
})
