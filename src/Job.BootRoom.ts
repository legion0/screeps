import { Job } from "./Job";
import { everyN } from "./Tick";
import { serverCache } from "./ServerCache";

interface JobBootRoomMemory {
	roomName: string;
	sourceIds: Id<Source>[];
}

export class JobBootRoom extends Job {
	static className = 'JobBootRoom';

	private room: Room;
	private memory: JobBootRoomMemory;

	constructor(id: Id<Job>, memory: JobBootRoomMemory) {
		super(id);
		this.room = Game.rooms[memory.roomName];
	}

	private getSources() {
		return serverCache.get(`${this.room.name}.sources`, 5000, () => this.room.find(FIND_SOURCES));
	}

	protected run() {
		everyN(5, () => {
			this.getSources().forEach(source => {
				// JobBootSource.create(source);
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

	static loadJob(id: Id<Job>, memory: any) {
		return new JobBootRoom(id, memory);
	}
}

Job.register.registerJobClass(JobBootRoom);
