import { CachedProperty } from "./Cache";
import { Job } from "./Job";
import { RoleUpgrader } from "./Role.Upgrader";
import { requestCreepSpawn, SpawnQueuePriority, findSources } from "./Room";
import { everyN } from "./Tick";
import { isConcreteStructure } from "./Structure";
import { findMinBy } from "./Array";

interface JobUpgradeControllerMemory {
	roomName: string;
	containerId?: Id<StructureContainer>;
	sourceId?: Id<Source>;
}

export class JobUpgradeController extends Job {
	private memory: JobUpgradeControllerMemory;
	room?: Room;
	controller?: StructureController;

	container = new CachedProperty<JobUpgradeController, StructureContainer>(this).setReaders([
		that => Game.time % 50 != 0 && Game.getObjectById(that.memory.containerId),
		that => that.controller?.pos?.findClosestByPath(FIND_STRUCTURES, { filter: s => isConcreteStructure(s, STRUCTURE_CONTAINER) }) as StructureContainer,
	]).setWriters([
		(value, that) => that.memory.containerId = value?.id
	]);

	source = new CachedProperty<JobUpgradeController, Source>(this).setReaders([
		that => Game.getObjectById(that.memory.sourceId),
		that => findMinBy(findSources(Game.rooms[that.memory.roomName]), s => s.pos.getRangeTo(that.controller)),
	]).setWriters([
		(value, that) => that.memory.sourceId = value?.id
	]);

	constructor(id: Id<Job>, memory: JobUpgradeControllerMemory) {
		super(id);
		this.memory = memory;
		this.room = Game.rooms[memory.roomName];
		this.controller = Game.rooms[memory.roomName]?.controller;
	}

	protected run() {
		everyN(5, () => {
			let name = this.id;
			requestCreepSpawn(Game.rooms[this.memory.roomName], name, () => ({
				priority: SpawnQueuePriority.UPGRADER,
				name: name,
				body: [MOVE, MOVE, CARRY, WORK],
				cost: BODYPART_COST[MOVE] + BODYPART_COST[MOVE] + BODYPART_COST[CARRY] + BODYPART_COST[WORK],
				opts: {
					memory: {
						job: this.id,
						role: RoleUpgrader.className,
					}
				}
			}));
		});
	}

	static create(roomName: string) {
		let id = `UpgradeController.${roomName}` as Id<Job>;
		let rv = Job.createBase(JobUpgradeController, id);
		if (rv != OK) {
			return rv;
		}
		let memory = Memory.jobs[id] as JobUpgradeControllerMemory;
		memory.roomName = roomName;
		return new JobUpgradeController(id, memory);
	}

	static className = 'JobUpgradeController';
}

Job.register.registerJobClass(JobUpgradeController);
