import * as assert from './assert';
import { findSources } from './Room';
import { Task } from './Task';
import { TaskBootSource } from './Task.BootSource';
import './Task.BuildRoom';
import { TaskBuildRoom } from './Task.BuildRoom';
import { TaskHarvestSource } from './Task.HarvestSource';
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
				if (!assert.hasProperty(source.room, 'controller')) {
					return;
				}
				if (source.room.controller.level < 2) {
					TaskBootSource.create(source);
				} else {
					TaskHarvestSource.create(source);
					TaskBootSource.remove(source);
				}
			});
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
