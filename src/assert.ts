export class AssertionError extends Error { }

export function strictEqual(actual: any, expected: any, message?: string): void {
	if (!Object.is(actual, expected)) {
		throw new AssertionError(makeMessage(`[${actual}] is not strictEqual [${expected}]`, message));
	}
}

export function ok(value: any, message?: string): void {
	if (!value) {
		throw new AssertionError(makeMessage(`[${value}] is not truthy`, message));
	}
}

export function instanceOf<T extends new (...args: any) => any>(value: any, expected: T, message?: string): value is InstanceType<T> {
	if (!(value instanceof expected)) {
		throw new AssertionError(makeMessage(`[${value}] is not instanceof [${expected}]`, message));
	}
	return true;
}

export function hasProperty<T, K extends keyof T>(o: T, prop: K, message?: string): o is Exclude<T, K> & Required<Pick<T, K>> {
	if (!(prop in o)) {
		throw new AssertionError(makeMessage(`[${prop}] not in [${o}]`, message));
	}
	return true;
}

export function isString(value?: any, message?: string): value is string {
	if (!_.isString(value)) {
		throw new AssertionError(makeMessage(`[${value}] not isString`, message));
	}
	return true;
}

export function isNumber(value?: any, message?: string): value is string {
	if (!_.isNumber(value)) {
		throw new AssertionError(makeMessage(`[${value}] not isNumber`, message));
	}
	return true;
}

function makeMessage(assertion: string, message?: string): string {
	let error: Error;
	try {
		throw Error('');
	} catch (err) {
		error = err;
	}

	return assertion + ' ' + (message ? message : '') + ' at ' + error.stack;
}
