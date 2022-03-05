import { findSources } from './Room';
import { Task } from './Task';
import { TaskBuildRoom } from './Task.BuildRoom';
import { TaskHarvestSource } from './Task.HarvestSource';
import { TaskUpgradeController } from './Task.UpgradeController';
import { everyN } from './Tick';

export class TaskBootRoom extends Task {
	static readonly className = 'BootRoom' as Id<typeof Task>;

	readonly roomName: string;

	readonly room: Room;

	constructor(roomName: Id<TaskBootRoom>) {
		super(TaskBootRoom, roomName);
		this.roomName = roomName;
		this.room = Game.rooms[roomName];

		if (!this.room) {
			this.remove();
		}
	}

	protected run() {
		// Boot sources
		everyN(10, () => {
			findSources(this.room).forEach((source) => {
				TaskHarvestSource.create(source);
			});
			TaskUpgradeController.create(this.room.name);
			TaskBuildRoom.create(this.roomName);
		});
	}

	static create(roomName: string) {
		const rv = Task.createBase(TaskBootRoom, roomName as Id<Task>);
		if (rv !== OK) {
			return rv;
		}
		return new TaskBootRoom(roomName as Id<TaskBootRoom>);
	}
}

Task.register.registerTaskClass(TaskBootRoom);
