import * as Action from './Action';
import { Job } from './Job';
import { JobBootSource } from './Job.BootSource';
import { Role } from './Role';
import { hasFreeCapacity, hasUsedCapacity } from './Store';
import { isDamaged } from './Structure';

type TargetType = StructureSpawn | StructureContainer | ConstructionSite | RoomPosition;

const sequence = [{
	// persistent harvesting
	test(creep: Creep, source: Source, target: TargetType) {
		return Action.isLast(creep, Action.ActionType.HARVEST) && hasUsedCapacity(source) && hasFreeCapacity(creep);
	},
	run(creep: Creep, source: Source, target: TargetType) {
		Action.harvest(creep, source);
	}
}, {
	// fill spawn asap
	test(creep: Creep, source: Source, target: TargetType) {
		return target instanceof StructureSpawn && hasFreeCapacity(target) && hasUsedCapacity(creep);
	},
	run(creep: Creep, source: Source, target: TargetType) {
		Action.transferEnergy(creep, target as StructureSpawn);
	}
}, {
	// init build
	test(creep: Creep, source: Source, target: TargetType) {
		return target instanceof ConstructionSite && hasUsedCapacity(creep);
	},
	run(creep: Creep, source: Source, target: TargetType) {
		Action.build(creep, target as ConstructionSite);
	}
}, {
	// persistent build
	test(creep: Creep, source: Source, target: TargetType) {
		return Action.isLast(creep, Action.ActionType.BUILD) && target instanceof ConstructionSite && hasUsedCapacity(creep);
	},
	run(creep: Creep, source: Source, target: TargetType) {
		Action.build(creep, target as ConstructionSite);
	}
}, {
	// init repair
	test(creep: Creep, source: Source, target: TargetType) {
		return target instanceof StructureContainer && isDamaged(target) && hasUsedCapacity(creep);
	},
	run(creep: Creep, source: Source, target: TargetType) {
		Action.repair(creep, target as StructureContainer);
	}
}, {
	// persistent repair
	test(creep: Creep, source: Source, target: TargetType) {
		return Action.isLast(creep, Action.ActionType.REPAIR) && target instanceof StructureContainer && isDamaged(target) && hasUsedCapacity(creep);
	},
	run(creep: Creep, source: Source, target: TargetType) {
		Action.repair(creep, target as StructureContainer);
	}
}, {
	// transfer to container
	test(creep: Creep, source: Source, target: TargetType) {
		return target instanceof StructureContainer && hasFreeCapacity(target) && hasUsedCapacity(creep);
	},
	run(creep: Creep, source: Source, target: TargetType) {
		Action.transferEnergy(creep, target as StructureContainer);
	}
}, {
	// harvest
	test(creep: Creep, source: Source, target: TargetType) {
		return hasFreeCapacity(creep) && hasUsedCapacity(source);
	},
	run(creep: Creep, source: Source, target: TargetType) {
		Action.harvest(creep, source);
	}
},];

export class RoleBoot extends Role {
	static className = 'RoleBoot';

	private job: JobBootSource;

	constructor(creep: Creep) {
		super(creep);
		this.job = Job.load(this.creep.memory.job) as JobBootSource;
	}

	run() {
		let source = this.job.getSource();
		let target = this.job.getTarget();

		for (let action of sequence) {
			if (action.test(this.creep, source, target)) {
				action.run(this.creep, source, target);
				return;
			}
		}

		this.creep.say('idle');
	}
}

Role.register.registerRole(RoleBoot);
