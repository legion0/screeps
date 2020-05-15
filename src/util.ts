/**
 * Sorts and array of objects with ids by their id property in lexicographical
 * order.
 *
 * @template T
 * @param {T[]} arr - The array to sort.
 * @returns {T[]} A sorted shallow copy of the original array.
 * @example const sortedArr = sortById(arr);
 */
export function sortById<T extends ObjectWithId<T>> (arr: T[]): T[] {
	return arr.sort((lhs: T, rhs: T) => lhs.id.localeCompare(rhs.id));
}

/* eslint-disable jsdoc/valid-types */
/**
 * Returns true iff the value is not undefined.
 *
 * @template T
 * @param {T|undefined} val - The value to check.
 * @returns {val is T} Returns true iff value is not undefined.
 * @example if (notUndefined(val)) doSomethingWith(val.someProperty)
 */
export function notUndefined<T> (val: T | undefined): val is T {
	return val !== undefined;
}
/* eslint-enable jsdoc/valid-types */
 