import { creepIsSpawning, getCreepTtl } from './Creep';

export class CreepPair {
  constructor(baseName: string) {
    this.mainName_ = baseName;
    this.altName_ = `${baseName}_alt`;
  }

  getActiveCreepName() {
    const main = Game.creeps[this.mainName_];
    const alt = Game.creeps[this.altName_];
    if (main && !creepIsSpawning(main) && alt && !creepIsSpawning(alt)) {
      return main.ticksToLive >= alt.ticksToLive ? main.name : alt.name;
    } else if (main && !creepIsSpawning(main)) {
      return main.name;
    } else if (alt && !creepIsSpawning(alt)) {
      return alt.name;
    }
    return this.mainName_;
  }

  getSecondaryCreepName() {
    return this.getActiveCreepName() == this.mainName_ ? this.altName_ : this.mainName_;
  }

  getActiveCreep() {
    return Game.creeps[this.getActiveCreepName()];
  }

  getSecondaryCreep() {
    return Game.creeps[this.getSecondaryCreepName()];
  }

  getActiveCreepTtl() {
    return getCreepTtl(this.getActiveCreep());
  }

  getLiveCreeps() {
    return [this.getActiveCreep(), this.getSecondaryCreep()].filter(creep => creep != null);
  }

  private mainName_: string;
  private altName_: string;
}
