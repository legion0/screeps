var MyCreep = require('creep.MyCreep')

class Harvester2 extends MyCreep {
	constructor(creep) {
		super(creep);
	}

    run() {
        if (this.creep.pos.getRangeTo(this.target) != 0) {
            let move_res = this.creep.moveTo(this.target);
            if ([OK, ERR_TIRED].indexOf(move_res) == -1) {
                this.log('ERROR ERROR', 'got move_res of', move_res);
            }
        } else {
            let harvest_res = this.creep.harvest(this.source);
            if ([OK].indexOf(harvest_res) == -1) {
                this.log('ERROR ERROR', 'got harvest_res of', harvest_res);
            }
        }
    }
}

Harvester2.ROLE = 'HARVESTER2';

Harvester2.BODY_PARTS = [MOVE, WORK, WORK, MOVE, WORK, WORK, MOVE, WORK, MOVE, MOVE];

module.exports = Harvester2;
