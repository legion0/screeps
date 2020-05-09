import { EventEnum, events } from "./Events";
import { log } from "./Logger";
import { MemInit } from "./Memory";

declare global {
	interface Memory {
		tasks: {};
	}
}

export interface TaskClass<SubClass> extends Registerable<typeof Task> {
	new(id: Id<SubClass>): SubClass;
}

class TaskClassRegister {
	private readonly _register: { [key: string]: TaskClass<any> } = {};

	registerTaskClass<SubClass>(taskClass: TaskClass<SubClass>) {
		this._register[taskClass.className] = taskClass;
	}

	getTaskClass(taskClassName: Id<TaskClass<any>>) {
		let taskClass = this._register[taskClassName];
		if (!taskClass) {
			throw new Error(`Task class [${taskClassName}] is not in the task class register!`);
		}
		return taskClass;
	}
}

export abstract class Task {
	protected readonly id: Id<Task>;

	protected constructor(subClass: TaskClass<any>, id: Id<Task>) {
		this.id = `${subClass.className}.${id}` as Id<Task>;
	}

	protected abstract run(): void;

	static register: TaskClassRegister = new TaskClassRegister();

	remove() {
		log.i(`removing task [${this.id}]`);
		delete Memory.tasks[this.id];
	}

	static removeTask(subClass: TaskClass<any>, id: Id<Task>) {
		let fullId = `${subClass.className}.${id}` as Id<Task>;
		delete Memory.tasks[fullId];
	}

	static runAll() {
		for (let id in Memory.tasks) {
			let task = Task.load(id as Id<Task>);
			if (task) {
				task.run();
			} else {
				log.e(`Failed to load task with id [${id}]`);
			}
		}
	}

	static load(id: Id<Task>) {
		if (!(id in Memory.tasks)) {
			log.e(`Cannot find task with id [${id}]`);
			return null;
		}
		let [className, subId] = id.split('.');
		let taskClass = Task.register.getTaskClass(className as Id<TaskClass<any>>);
		if (!taskClass) {
			log.e(`Cannot find class for task id [${id}]`);
			return null;
		}
		return new taskClass(subId as Id<Task>) as Task;
	}

	protected static createBase(subClass: TaskClass<any>, id: Id<Task>, initMemory = null) {
		let fullId = `${subClass.className}.${id}`;
		if (fullId in Memory.tasks) {
			return ERR_NAME_EXISTS;
		}
		log.i(`Creating task [${fullId}]`);
		Memory.tasks[fullId] = initMemory;

		return OK;
	}
}

events.listen(EventEnum.HARD_RESET, () => {
	delete Memory.tasks;
	MemInit(Memory, 'tasks', {});
});

MemInit(Memory, 'tasks', {});
