import { findMinBy } from "./Array";
import { getWithCallback, objectServerCache } from "./Cache";
import { RoleUpgrader } from "./Role.Upgrader";
import { findSources, requestCreepSpawn, SpawnQueuePriority } from "./Room";
import { isConcreteStructure } from "./Structure";
import { Task } from "./Task";
import { everyN } from "./Tick";

interface TaskUpgradeControllerMemory {
	roomName: string;
	containerId?: Id<StructureContainer>;
	sourceId?: Id<Source>;
}

export class TaskUpgradeController extends Task {
	static className = 'TaskUpgradeController' as Id<typeof Task>;

	readonly room: Room;
	readonly controller?: StructureController;
	readonly container?: StructureContainer;
	readonly source?: Source;

	constructor(roomName: Id<TaskUpgradeController>) {
		super(TaskUpgradeController, roomName);
		this.room = Game.rooms[roomName];
		this.controller = Game.rooms[roomName]?.controller;
		this.container = getWithCallback(objectServerCache, `${this.id}.container`, 50, findContainer, this.controller?.pos) as StructureContainer;
		this.source = getWithCallback(objectServerCache, `${this.id}.source`, 50, findSource, this.controller?.pos) as Source;
	}

	protected run() {
		everyN(50, () => {
			let name = this.id;
			requestCreepSpawn(this.controller?.room, name, () => ({
				priority: SpawnQueuePriority.UPGRADER,
				name: name,
				body: [MOVE, MOVE, CARRY, WORK],
				cost: BODYPART_COST[MOVE] + BODYPART_COST[MOVE] + BODYPART_COST[CARRY] + BODYPART_COST[WORK],
				opts: {
					memory: {
						task: this.id,
						role: RoleUpgrader.className,
					}
				}
			}));
		});
	}

	static create(roomName: string) {
		let rv = Task.createBase(TaskUpgradeController, roomName as Id<Task>);
		if (rv != OK) {
			return rv;
		}
		return new TaskUpgradeController(roomName as Id<TaskUpgradeController>);
	}
}

Task.register.registerTaskClass(TaskUpgradeController);

function findContainer(controllerPos: RoomPosition): StructureContainer {
	return controllerPos?.findClosestByPath(FIND_STRUCTURES, { filter: s => isConcreteStructure(s, STRUCTURE_CONTAINER) }) as StructureContainer;
}

function findSource(controllerPos: RoomPosition): Source {
	return findMinBy(findSources(Game.rooms[controllerPos.roomName]), s => s.pos.getRangeTo(controllerPos));
}
