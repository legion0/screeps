import * as A from './Action';
import { getWithCallback, objectServerCache } from './Cache';
import { log } from "./Logger";
import { nextExtensionPos } from "./Planning";
import { findMyConstructionSites, findSources, requestCreepSpawn, SpawnQueuePriority } from "./Room";
import { isConcreteStructure, isConstructionSiteForStructure } from './Structure';
import { Task } from "./Task";
import { everyN } from "./Tick";
import { findMinBy } from './Array';

interface SequenceContext {
	creep: Creep;
	task: TaskBuildRoom;
}

const buildCreepActions = [
	// continue harvesting
	new A.Harvest<SequenceContext>().continue().setCallback(c => findSources(c.task.room)[0]),
	// continue building
	new A.Build<SequenceContext>().continue().setCallback(c => c.task.constructionSite),
	// withdraw from container
	new A.Withdraw<SequenceContext>().setCallback(c => c.task.container),
	// init build
	new A.Build<SequenceContext>().setCallback(c => c.task.constructionSite),
	// init harvest
	new A.Harvest<SequenceContext>().setCallback(c => findSources(c.task.room)[0]),
];

export class TaskBuildRoom extends Task {
	static readonly className = 'BuildRoom' as Id<typeof Task>;
	readonly roomName: string;
	readonly room?: Room;
	readonly container?: StructureContainer;
	readonly constructionSite?: ConstructionSite;
	readonly constructionSites: ConstructionSite[];

	constructor(roomName: Id<TaskBuildRoom>) {
		super(TaskBuildRoom, roomName);
		this.roomName = roomName;
		this.room = Game.rooms[roomName];
		this.constructionSites = findMyConstructionSites(this.room);
		this.constructionSite = findNextConstructionSite(this.constructionSites);
		if (this.constructionSite) {
			this.container = getWithCallback(objectServerCache, `${this.id}.container`, 50, findContainer, this.constructionSite) as StructureContainer;
		}

		if (!this.room) {
			this.remove();
		}
	}

	protected run() {
		// create new extensions
		everyN(50, () => {
			for (let pos of nextExtensionPos(this.room)) {
				let rv = pos.createConstructionSite(STRUCTURE_EXTENSION);
				if (rv != OK) {
					log.e(`Failed to created STRUCTURE_EXTENSION at [${pos}]`);
				}
			}
		});

		// run builders
		if (this.constructionSites.length) {
			let progressRemaining = _.sum(this.constructionSites, s => s.progressTotal - s.progress);
			let numCreeps = Math.min(Math.ceil(progressRemaining / 5000), 3);
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
	return constructionSite.pos.findClosestByPath(FIND_STRUCTURES, { filter: s => isConcreteStructure(s, STRUCTURE_CONTAINER) && s.store.energy }) as StructureContainer;
}

function findNextConstructionSite(constructionSites: ConstructionSite[]): ConstructionSite {
	return findMinBy(constructionSites, s => 1 - s.progress / s.progressTotal);
}

Task.register.registerTaskClass(TaskBuildRoom);
