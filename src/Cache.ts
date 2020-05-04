// interface CacheService<T> {
// 	get(id: string): T;
// 	set(id: string, value: T): void;
// }

// class CacheItem<T> {
// 	private service: CacheService<T>;
// 	private key: string;
// 	private callback: () => T;
// 	private onLoadCallback?: (item: T) => void;

// 	constructor(service: CacheService<T>, key: string, callback: () => T) {
// 		this.service = service;
// 		this.key = key;
// 		this.callback = callback;
// 	}

// 	get(): T {
// 		let item = this.service.get(this.key);
// 		if (item !== undefined) {
// 			return item;
// 		}
// 		item = this.callback() ?? null;
// 		this.service.set(this.key, item);
// 		if (this.onLoadCallback) {
// 			this.onLoadCallback(item);
// 		}
// 		return item;
// 	}

// 	// this callback is called with the result of the costrctor callback when it is used to load the data.
// 	onLoad(callback: (item: T) => void) {
// 		this.onLoadCallback = callback;
// 	}
// }

export class CachedProperty<ThatType, PropType> {
	private that: ThatType;
	private readers?: ((that: ThatType) => PropType)[] = [];
	private writers?: ((value: PropType, that?: ThatType) => void)[] = [];
	private value?: PropType;

	constructor(that: ThatType) {
		this.that = that;
	}

	setReaders(readers: Array<(that: ThatType) => PropType>) {
		this.readers = readers;
		return this;
	}

	setWriters(writers: Array<(value: PropType, that?: ThatType) => void>) {
		this.writers = writers;
		return this;
	}

	get() {
		if (this.value === undefined) {
			let value = undefined;
			for (let loader of this.readers) {
				value = loader(this.that);
				if (value != null) {
					break;
				}
			}
			this.value = value ?? null;
			for (let writer of this.writers) {
				writer(this.value, this.that);
			}
		}
		return this.value;
	}
}
