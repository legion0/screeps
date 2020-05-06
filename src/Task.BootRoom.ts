import { findSources } from "./Room";
import { Task } from "./Task";
import { TaskBootSource } from "./Task.BootSource";
import { everyN } from "./Tick";

interface TaskBootRoomMemory {
	roomName: string;
}

export class TaskBootRoom extends Task {
	static readonly className = 'BootRoom' as Id<typeof Task>;
	readonly room: Room;

	constructor(roomName: Id<TaskBootRoom>) {
		super(TaskBootRoom, roomName);
		this.room = Game.rooms[roomName];
		if (!this.room) {
			this.remove();
		}
	}

	protected run() {
		everyN(5, () => {
			findSources(this.room).forEach(source => {
				TaskBootSource.create(source);
			});
		});
	}

	static create(roomName: string) {
		let rv = Task.createBase(TaskBootRoom, roomName as Id<Task>);
		if (rv != OK) {
			return rv;
		}
		return new TaskBootRoom(roomName as Id<TaskBootRoom>);
	}
}

Task.register.registerTaskClass(TaskBootRoom);
