import { findMinBy } from "./Array";
import { CachedProperty } from "./Cache";
import { Job } from "./Job";
import { MemCachedObject } from "./Memory";
import { RoleUpgrader } from "./Role.Upgrader";
import { findSources, requestCreepSpawn, SpawnQueuePriority } from "./Room";
import { serverCache } from "./ServerCache";
import { isConcreteStructure } from "./Structure";
import { everyN } from "./Tick";

interface JobUpgradeControllerMemory {
	roomName: string;
	containerId?: Id<StructureContainer>;
	sourceId?: Id<Source>;
}

function findContainer(pos: RoomPosition): StructureContainer {
	if (!pos) {
		return null;
	}
	return serverCache.getObject(`${pos}.findClosestByPath.container`, 100, () => pos.findClosestByPath(FIND_STRUCTURES, { filter: s => isConcreteStructure(s, STRUCTURE_CONTAINER) }));
}

export class JobUpgradeController extends Job {
	private memory: JobUpgradeControllerMemory;
	room?: Room;
	controller?: StructureController;

	container = new CachedProperty<JobUpgradeController, StructureContainer>(this).setReaders([
		that => MemCachedObject(that.memory.containerId, /*timeout=*/50),
		that => findContainer(that.controller?.pos),
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
