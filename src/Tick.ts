/**
 * Executes {callback} every {ticks} ticks.
 *
 * @template T
 * @param {number} ticks - The interval every which {callback} will be invoked.
 * @param {() => T} callback - The function to invoke every {ticks} ticks.
 * @returns {T | undefined} The return value of {callback} or undefined if
 * {callback} was not executed.
 * @example everyN(5, () => doX())
 */
export function everyN<T> (ticks: number, callback: () => T): T | undefined {
	// eslint-disable-next-line no-magic-numbers
	if (Game.time % ticks === 0) {
		return callback();
	}

	return undefined;
}
