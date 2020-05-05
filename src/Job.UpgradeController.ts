import { findMinBy } from "./Array";
import { objectServerCache } from "./Cache";
import { Job } from "./Job";
import { RoleUpgrader } from "./Role.Upgrader";
import { findSources, requestCreepSpawn, SpawnQueuePriority } from "./Room";
import { isConcreteStructure } from "./Structure";
import { everyN } from "./Tick";

interface JobUpgradeControllerMemory {
	roomName: string;
	containerId?: Id<StructureContainer>;
	sourceId?: Id<Source>;
}

export class JobUpgradeController extends Job {
	readonly roomName: string;
	readonly controller?: StructureController;
	readonly container?: StructureContainer;
	readonly source?: Source;

	constructor(id: Id<Job>, memory: JobUpgradeControllerMemory) {
		super(id);
		this.roomName = memory.roomName;
		this.controller = Game.rooms[this.roomName]?.controller;
		this.container = objectServerCache.getWithCallback(`${this.id}.container`, 50, findContainer, this.controller?.pos) as StructureContainer;
		this.source = objectServerCache.getWithCallback(`${this.id}.source`, 50, findSource, this.controller?.pos) as Source;
	}

	protected run() {
		everyN(5, () => {
			let name = this.id;
			requestCreepSpawn(this.controller?.room, name, () => ({
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

function findContainer(controllerPos: RoomPosition): StructureContainer {
	return controllerPos?.findClosestByPath(FIND_STRUCTURES, { filter: s => isConcreteStructure(s, STRUCTURE_CONTAINER) }) as StructureContainer;
}

function findSource(controllerPos: RoomPosition): Source {
	return findMinBy(findSources(Game.rooms[controllerPos.roomName]), s => s.pos.getRangeTo(controllerPos));
}
