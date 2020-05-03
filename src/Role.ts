export abstract class Role {
	static register: RoleRegister;
	public creep: Creep;
	constructor(creep: Creep) {
		this.creep = creep;
	}
	abstract run(): void;

	static runAll() {
		for (let creep of Object.values(Game.creeps)) {
			if (!creep.spawning && creep.memory.role) {
				Role.register.decorate(creep.memory.role, creep).run();
			}
		}
	}
}

type RoleClass = typeof Role & Registerable;

class RoleRegister {
	private _register: { [key: string]: RoleClass } = {};

	registerRole(class_: RoleClass) {
		this._register[class_.className] = class_;
	}

	decorate(roleName: string, creep: Creep) {
		let class_ = this._register[roleName];
		if (!class_) {
			throw `Role [${roleName}] is not in the role register!`;
		}
		return new class_(creep);
	}

	getRole(roleName: string) {
		let class_ = this._register[roleName];
		if (!class_) {
			throw `Role [${roleName}] is not in the role register!`;
		}
		return class_;
	}
}

Role.register = new RoleRegister();
