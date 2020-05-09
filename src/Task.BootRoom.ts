import { findSources } from "./Room";
import { Task } from "./Task";
import { TaskBootSource } from "./Task.BootSource";
import { TaskBuildRoom } from './Task.BuildRoom';
import './Task.BuildRoom';
import { everyN } from "./Tick";

export class TaskBootRoom extends Task {
	static readonly className = 'BootRoom' as Id<typeof Task>;
	readonly roomName: string;
	readonly room?: Room;

	constructor(roomName: Id<TaskBootRoom>) {
		super(TaskBootRoom, roomName);
		this.roomName = roomName;
		this.room = Game.rooms[roomName];

		if (!this.room) {
			this.remove();
		}
	}

	protected run() {
		// boot sources
		everyN(10, () => {
			findSources(this.room).forEach(source => {
				TaskBootSource.create(source);
			});
			// TaskBuildRoom.create(this.roomName);
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
