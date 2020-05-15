/**
 * @param o
 * @param name
 * @param value
 * @param forced
 * @example
 */
export function memInit<T, K extends keyof T> (
	o: T,
	name: K, value: Exclude<T[K], undefined>, forced = false
): Exclude<T[K], undefined> {
	if (forced || o[name] === undefined) {
		o[name] = value;
	}
	return o[name] as Exclude<T[K], undefined>;
}
