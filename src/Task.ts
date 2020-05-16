import { EventEnum, events } from './Events';
import { log } from './Logger';
import { memInit } from './Memory';

declare global {
	interface Memory {
		tasks: {};
	}
}

class TaskClassRegister {
	private readonly register: { [key: string]: TaskClass<any> } = {
	};

	registerTaskClass<SubClass>(taskClass: TaskClass<SubClass>) {
		this.register[taskClass.className] = taskClass;
	}

	getTaskClass(taskClassName: Id<TaskClass<any>>) {
		const taskClass = this.register[taskClassName];
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
		const fullId = `${subClass.className}.${id}` as Id<Task>;
		delete Memory.tasks[fullId];
	}

	static runAll() {
		for (const id of Object.keys(Memory.tasks)) {
			const task = Task.load(id as Id<Task>);
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
		const [className, subId] = id.split('.');
		const TaskSubClass = Task.register.getTaskClass(className as Id<TaskClass<any>>);
		if (!TaskSubClass) {
			log.e(`Cannot find class for task id [${id}]`);
			return null;
		}
		return new TaskSubClass(subId as Id<Task>) as Task;
	}

	protected static createBase(subClass: TaskClass<any>, id: Id<Task>, initMemory = null) {
		const fullId = `${subClass.className}.${id}`;
		if (fullId in Memory.tasks) {
			return ERR_NAME_EXISTS;
		}
		log.i(`Creating task [${fullId}]`);
		Memory.tasks[fullId] = initMemory;

		return OK;
	}
}

export interface TaskClass<SubClass> extends Registerable<typeof Task> {
	new(id: Id<SubClass>): SubClass;
}

events.listen(EventEnum.HARD_RESET, () => {
	memInit(Memory, 'tasks', {}, true);
});

memInit(Memory, 'tasks', {});
