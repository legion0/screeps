import * as A from './Action';
import { findMaxBy } from './Array';
import { getWithCallback, objectServerCache } from './Cache';
import { log } from "./Logger";
import { nextExtensionPos } from "./Planning";
import { findMyConstructionSites, findRoomSource, requestCreepSpawn, RoomSource, SpawnQueuePriority, currentConstruction, constructionQueueSize, requestConstruction, BuildQueuePriority } from "./Room";
import { findNearbyEnergy } from './RoomPosition';
import { isConcreteStructure } from './Structure';
import { Task } from "./Task";
import { everyN } from "./Tick";

interface SequenceContext {
	creep: Creep;
	task: TaskBuildRoom;
}

const buildCreepActions = [
	new A.Build<SequenceContext>().setArgs(c => c.task.constructionSite),
	new A.Pickup<SequenceContext>().setArgs(c => findNearbyEnergy(c.creep.pos)),
	new A.Withdraw<SequenceContext>().setArgs(c => c.task.roomSource).setPersist(),
];

export class TaskBuildRoom extends Task {
	static readonly className = 'BuildRoom' as Id<typeof Task>;
	readonly roomName: string;
	readonly room: Room;
	readonly roomSource?: RoomSource;
	readonly constructionSite?: ConstructionSite;
	private constructionQueueSize: number;

	constructor(roomName: Id<TaskBuildRoom>) {
		super(TaskBuildRoom, roomName);
		this.roomName = roomName;
		this.room = Game.rooms[roomName];
		this.constructionSite = currentConstruction(this.room.name);
		this.constructionQueueSize = constructionQueueSize(this.room.name);
		if (this.constructionSite) {
			this.roomSource = findRoomSource(this.room);
		}
	}

	protected run() {
		// create new extensions
		everyN(50, () => {
			for (let pos of nextExtensionPos(this.room)) {
				let rv = requestConstruction(pos, STRUCTURE_EXTENSION, BuildQueuePriority.EXTENSION);
				if (rv != OK && rv != ERR_NAME_EXISTS) {
					log.e(`Failed to request STRUCTURE_EXTENSION at [${pos}]`);
				}
			}
		});

		// run builders
		let numCreeps = Math.min(Math.ceil(this.constructionQueueSize / 5000), 3);
		for (let i = 0; i < 3; i++) {
			let name = `${this.id}.${i}`;
			let creep = Game.creeps[name];
			if (creep) {
				A.runSequence(buildCreepActions, creep, { creep: creep, task: this });
			} else if (i < numCreeps) {
				everyN(20, () => {
					requestCreepSpawn(this.room, name, () => ({
						priority: SpawnQueuePriority.BUILDER,
						name: name,
						body: [MOVE, MOVE, CARRY, WORK],
						cost: BODYPART_COST[MOVE] + BODYPART_COST[MOVE] + BODYPART_COST[CARRY] + BODYPART_COST[WORK],
					}));
				});
			}
		}
	}

	static create(roomName: string) {
		let rv = Task.createBase(TaskBuildRoom, roomName as Id<Task>);
		if (rv != OK) {
			return rv;
		}
		return new TaskBuildRoom(roomName as Id<TaskBuildRoom>);
	}
}

function findContainer(constructionSite: ConstructionSite): StructureContainer {
	return getWithCallback(objectServerCache, `${constructionSite.id}.container`, 50, findContainerImpl, constructionSite) as StructureContainer;
}
function findContainerImpl(constructionSite: ConstructionSite): StructureContainer {
	let containers = constructionSite.room.find(FIND_STRUCTURES).filter(s => isConcreteStructure(s, STRUCTURE_CONTAINER)) as StructureContainer[];
	return findMaxBy(containers, s => s.store.energy);
}

function findNextConstructionSite(constructionSites: ConstructionSite[]): ConstructionSite {
	return findMaxBy(constructionSites, s => s.progress / s.progressTotal);
}

Task.register.registerTaskClass(TaskBuildRoom);
