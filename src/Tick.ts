export let everyN = (n: number, callback: Function) => {
	if (Game.time % n == 0) {
		return callback();
	} else {
		return null;
	}
}
