export enum EventEnum {
	EVENT_TICK_START,
	EVENT_TICK_END,
	NEW_ROOM_DISCOVERED,
	HARD_RESET,
}

interface Callback extends Function {
	(context?: any, data?: any, event?: EventEnum): boolean | void;
}

interface Event {
	callback: Callback;
	context?: any;
}

class Events {
	private events: { [key in EventEnum]?: Event[] } = {};

	listen(event: EventEnum, callback: Callback, context?: any) {
		const callbacks = this.events[event] ?? (this.events[event] = []);
		callbacks.push({
			callback,
			context,
		});
	}

	fire(event: EventEnum, data?: any) {
		const callbacks = this.events[event];
		if (!callbacks) {
			return;
		}
		for (const callback of callbacks) {
			if (callback.callback.call(callback.context, event, data) === false) {
				return;
			}
		}
	}
}

export const events = new Events();
