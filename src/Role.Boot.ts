import { errorCodeToString } from './constants';
import { log } from './Logger';
import { Role } from './Role';
import { JobBootSource } from './Job.BootSource';
import { Job } from './Job';

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

		let seekSpawn = (target: StructureSpawn) => {
			if (this.creep.pos.isNearTo(target)) {
				let rv = this.creep.transfer(target, RESOURCE_ENERGY, Math.min(this.creep.store.energy, target.energyCapacity - target.energy));
				if (rv != OK) {
					log.e(`Failed to transfer resource from creep [${this.creep.name}] to target StructureSpawn [${target.pos}] with error [${errorCodeToString(rv)}]`);
				}
			} else if (!this.creep.fatigue) {
				let rv = this.creep.moveTo(target);
				if (rv != OK) {
					log.e(`Failed to move creep [${this.creep.name}] to targetStructureSpawn [${target.pos}] with error [${errorCodeToString(rv)}]`);
				}
			}
		};

		let seekContainer = (target: StructureContainer) => {
			if (this.creep.pos.isNearTo(target)) {
				let rv = this.creep.transfer(target, RESOURCE_ENERGY, Math.min(this.creep.store.energy, target.store.getFreeCapacity(RESOURCE_ENERGY)));
				if (rv != OK) {
					log.e(`Failed to transfer resource from creep [${this.creep.name}] to target StructureContainer [${target.pos}] with error [${errorCodeToString(rv)}]`);
				}
			} else if (!this.creep.fatigue) {
				let rv = this.creep.moveTo(target);
				if (rv != OK) {
					log.e(`Failed to move creep [${this.creep.name}] to target StructureContainer [${target.pos}] with error [${errorCodeToString(rv)}]`);
				}
			}
		};

		let seekConstructionSite = (target: ConstructionSite<STRUCTURE_CONTAINER>) => {
			if (this.creep.pos.isNearTo(target)) {
				let rv = this.creep.build(target);
				if (rv != OK) {
					log.e(`Failed to build for creep [${this.creep.name}] at STRUCTURE_CONTAINER [${target.pos}] with error [${errorCodeToString(rv)}]`);
				}
			} else if (!this.creep.fatigue) {
				let rv = this.creep.moveTo(target);
				if (rv != OK) {
					log.e(`Failed to move creep [${this.creep.name}] to target STRUCTURE_CONTAINER [${target.pos}] with error [${errorCodeToString(rv)}]`);
				}
			}
		};

		let seekSource = (source: Source) => {
			if (this.creep.pos.isNearTo(source)) {
				let rv = this.creep.harvest(source);
				if (rv != OK) {
					log.e(`Failed to harvest source [${source.pos}] from creep [${this.creep.name}] with error [${errorCodeToString(rv)}]`);
				}
			} else if (!this.creep.fatigue) {
				let rv = this.creep.moveTo(source);
				if (rv != OK) {
					log.e(`Failed to move creep [${this.creep.name}] to source [${source.pos}] with error [${errorCodeToString(rv)}]`);
				}
			}
		};

		if (this.creep.store.energy == this.creep.carryCapacity) {
			if (target instanceof StructureSpawn) {
				seekSpawn(target);
			} else if (target instanceof StructureContainer) {
				seekContainer(target);
			} else if (target instanceof ConstructionSite) {
				seekConstructionSite(target);
			} else {
				this.creep.say('idle');
			}
		} else {
			seekSource(source);
		}
	}
}

Role.register.registerRole(RoleBoot);
