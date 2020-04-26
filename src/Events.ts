export enum EventEnum {
	EVENT_TICK_START,
	EVENT_TICK_END,
};

interface Callback extends Function
{
		(context?: any, data?: any, event?: EventEnum): boolean | void;
}

interface Event {
	// callback to execute, return false from a callback to break the callbacks execution for that event.
	callback: Callback;
	context?: any;
}

var stuff: { [key: string]: string; } = {};

class Events {
	private events: { [key in EventEnum]?: Event[] } = {};

	listen(event: EventEnum, callback: Callback, context?: any) {
		let callbacks = this.events[event] ?? (this.events[event] = []);
		callbacks.push({
			callback: callback,
			context: context,
		});
	}

	fire(event: EventEnum, data?: any) {
		var callbacks = this.events[event];
		if (!callbacks) {
			return;
		}
		for (let callback of callbacks) {
			if (callback.callback.call(callback.context, event, data) === false) {
				return;
			}
		}
	}
};

export let events = new Events();
