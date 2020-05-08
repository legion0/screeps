export function sortById<T extends ObjectWithId<T>>(items: T[]): T[] {
	return _.sortBy(items, s => s.id);
}
