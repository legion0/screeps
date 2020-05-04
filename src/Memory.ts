import { serverCache } from "./ServerCache";

// prevents objects from being cached in memory for too long when we might want to revisit out options.
// e.g. maybe a close container has been constructred since the last time we checked where the closest container is.
export function MemCachedObject<T>(id: Id<T>, timeout: number): T {
	let lastClear = serverCache.getRaw(`${id}.lastClear`, timeout, () => Game.time) as number;
	if (Game.time - lastClear < timeout) {
		return Game.getObjectById(id);
	}
	return null;
}
