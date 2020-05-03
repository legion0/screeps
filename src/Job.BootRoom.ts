import { Job } from "./Job";
import { everyN } from "./Tick";
import { serverCache } from "./ServerCache";
import { JobBootSource } from "./Job.BootSource";

interface JobBootRoomMemory {
	roomName: string;
}

export class JobBootRoom extends Job {
	private room: Room;

	constructor(id: Id<Job>, memory: JobBootRoomMemory) {
		super(id);
		this.room = Game.rooms[memory.roomName];
	}

	private getSources() {
		return serverCache.get(`${this.room.name}.sources`, 100, () => this.room.find(FIND_SOURCES)) as Source[];
	}

	protected run() {
		everyN(5, () => {
			this.getSources().forEach(source => {
				JobBootSource.create(source);
			});
		});
	}

	static create(room: Room) {
		let id = `BootRoom.${room.name}` as Id<Job>;
		let rv = Job.createBase(JobBootRoom, id);
		if (rv != OK) {
			return rv;
		}
		let memory = Memory.jobs[id] as JobBootRoomMemory;
		memory.roomName = room.name;
		return new JobBootRoom(id, memory);
	}

	static className = 'JobBootRoom';
}

Job.register.registerJobClass(JobBootRoom);
