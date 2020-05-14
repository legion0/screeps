export function sortById<T extends ObjectWithId<T>>(items: T[]): T[] {
	return items.sort((lhs: T, rhs: T) => lhs.id.localeCompare(rhs.id));
}

export function notUndefined<T>(x: T | undefined): x is T {
	return x !== undefined;
}
