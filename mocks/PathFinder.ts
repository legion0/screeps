import { register } from "./Register";
import { driver } from "./Driver";
import { CostMatrix } from "./CostMatrix";

export class PathFinder {
	static CostMatrix = CostMatrix;

	static search(origin, goal, options): PathFinderPath {
		if (!goal || Array.isArray(goal) && !goal.length) {
			return { path: [], ops: 0 } as PathFinderPath;
		}
		return driver.pathFinder.search(origin, goal, options);
	}

	static use(isActive) {
		if (!isActive) {
			register.deprecated('`PathFinder.use` is considered deprecated and will be removed soon.');
		}
		register._useNewPathFinder = !!isActive;
	}
}
