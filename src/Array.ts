export function findMinBy<T>(arr: T[], predicate: (element: T) => number): T {
	if (!arr.length) {
		return null;
	}
	let min: [T, number] = [arr[0], predicate(arr[0])];
	for (let i = 1; i < arr.length; i++) {
		let current = predicate(arr[i]);
		if (current < min[1]) {
			min = [arr[i], current];
		}
	}
	return min[0];
}

export function findMaxBy<T>(arr: T[], predicate: (element: T) => number): T {
	if (!arr.length) {
		return null;
	}
	let max: [T, number] = [arr[0], predicate(arr[0])];
	for (let i = 1; i < arr.length; i++) {
		let current = predicate(arr[i]);
		if (current > max[1]) {
			max = [arr[i], current];
		}
	}
	return max[0];
}
