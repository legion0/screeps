var CONSTANTS = require('constants');
var events = require('events');

var HarvesterCreep = require('creep.Harvester');
var UpgraderCreep = require('creep.Upgrader');
var BuilderCreep = require('creep.Builder');
var MuleCreep = require('creep.Mule');
var RepairCreep = require('creep.Repair');

var WORKFORCE_BODY_PARTS = [WORK,MOVE, CARRY,MOVE, WORK,MOVE, CARRY,MOVE, WORK,MOVE, CARRY,MOVE, WORK,MOVE, CARRY,MOVE, WORK,MOVE, CARRY,MOVE];
var BUILDERS_BOOST = 0.5;

events.listen(CONSTANTS.EVENT_ROOM_DISCOVERED, (event_name, roomName) => {
    // console.log('WorkforceManager', 'EVENT_ROOM_DISCOVERED', roomName);
    var room = Game.rooms[roomName];
    var memory = Memory.rooms[roomName];

    var lairs = room.findKeeperLairs();
    if (lairs.length > 1) {
        console.log('ERROR ERROR ERROR ERROR ERROR', 'Found too many lairs', lairs.length);
    }
    if (lairs.length) {
        var lair = lairs[0];
        var source = lair.pos.findClosestByRange(FIND_SOURCES);
        if (source) {
            memory.lair_source_id = source.id;
        }
    }

    memory.workforce_manager = {
        body_parts: [WORK,MOVE, CARRY,MOVE],
        body_price: 250,
        required_builders: 0,
        last_builders_eval: 0,
    };
    return true;
});

function WorkforceManager(room) {
    this.room = room;
    this.memory = room.memory.workforce_manager;
    this.creeps = room.find(FIND_MY_CREEPS, {filter: (creep) => [
        CONSTANTS.ROLE_HARVESTER,
        CONSTANTS.ROLE_MULE,
        CONSTANTS.ROLE_BUILDER,
        CONSTANTS.ROLE_REPAIR,
        CONSTANTS.ROLE_UPGRADER,
        null,
        undefined].indexOf(creep.role) != -1});
    this.sources = room.findSources();
}

function reassignWorker(source, target, role_name) {
    var creep = source.pop();
    creep.deleteMemory();
    creep.role = role_name;
    target.push(creep);
}

WorkforceManager.prototype.run = function() {
    var room = this.room;
    var memory = this.memory;

    if (!memory) {
        console.log(Game.time, 'WorkforceManager waiting for memory init ...');
        return;
    }

    if (Game.time % 50 != 0) {
        this.recalculateDefaultBody();
    }

    var creeps = this.creeps;
    var harvesters = _.filter(creeps, (creep) => creep.role == CONSTANTS.ROLE_HARVESTER);
    var mules = _.filter(creeps, (creep) => creep.role == CONSTANTS.ROLE_MULE);
    var builders = _.filter(creeps, (creep) => creep.role == CONSTANTS.ROLE_BUILDER);
    var repairs = _.filter(creeps, (creep) => creep.role == CONSTANTS.ROLE_REPAIR);
    var upgraders = _.filter(creeps, (creep) => creep.role == CONSTANTS.ROLE_UPGRADER);
    var unemployed = _.filter(creeps, (creep) => creep.role == null);

    while (unemployed.length) {
        var creep = unemployed.pop();
        creep.deleteMemory();
        creep.role = CONSTANTS.ROLE_UPGRADER;
        upgraders.push(creep);
    }

    var required_harvesters = this.requiredHarveters();
    var required_mules = this.requiredMules();
    var required_builders = this.requiredBuilders();
    var required_repairs = this.requiredRepairs();
    var required_upgraders = this.requiredUpgraders();
    var required_workforce_size = required_harvesters + required_mules + required_builders + required_repairs + required_upgraders;

    if (Game.time % 10 == 0) {
        console.log(
            Game.time,
            'harvesters', harvesters.length, '/', required_harvesters,
            'mules', mules.length, '/', required_mules,
            'builders', builders.length, '/', required_builders,
            'repairs', repairs.length, '/', required_repairs,
            'upgraders', upgraders.length, '/', required_upgraders);
    }
    if (creeps.length < required_workforce_size && room.energyAvailable >= memory.body_price) {
        var spawns = room.find(FIND_MY_SPAWNS);
        var new_creep_count = 0;
        for (i in spawns) {
            var spawn = spawns[i];
            var new_name = spawn.createCreep(memory.body_parts);
            if (_.isString(new_name)) {
                // console.log('Created new Spawn', new_name);
                ++new_creep_count;
                if (creeps.length + new_creep_count == required_workforce_size) {
                    break;
                }
            }
        }
    }

    // var min_harvesters = 2;
    var min_mules = 0;
    if (creeps.length > 10) {
        min_mules = 1;
    }
    var min_builders = 0;
    if (creeps.length > 10) {
        min_builders = 2;
    }
    var min_upgraders = 0;
    if (creeps.length > 10) {
        min_upgraders = 1;
    }
    this._rebalanceWorkforce([
            {
                role: CONSTANTS.ROLE_MULE,
                creeps: mules,
                min: min_mules,
                max: required_mules
            },{
                role: CONSTANTS.ROLE_HARVESTER,
                creeps: harvesters,
                min: 0,
                max: required_harvesters
            },{
                role: CONSTANTS.ROLE_BUILDER,
                creeps: builders,
                min: min_builders,
                max: required_builders
            },{
                role: CONSTANTS.ROLE_REPAIR,
                creeps: repairs,
                min: 0,
                max: required_repairs
            },{
                role: CONSTANTS.ROLE_UPGRADER,
                creeps: upgraders,
                min: min_upgraders,
                max: required_upgraders
            }
        ]);

    let mule_prefer_spawns = false;
    if (creeps.length < required_workforce_size) {
        mule_prefer_spawns = true;
    }
    harvesters.forEach((creep) => {
        new HarvesterCreep(creep).run();
    });
    mules.forEach((creep) => {
        new MuleCreep(creep, mule_prefer_spawns).run();
    });
    builders.forEach((creep) => {
        new BuilderCreep(creep).run();
    });
    repairs.forEach((creep) => {
        new RepairCreep(creep).run();
    });
    upgraders.forEach((creep) => {
        new UpgraderCreep(creep).run();
    });
};

WorkforceManager.prototype._rebalanceWorkforce = function(workforce) {
    // Surplus
    for (let i = 0; i < workforce.length - 1; ++i) {
        let conf = workforce[i];
        if (conf.creeps.length > conf.max) {
            for (let j = i+1; j < workforce.length; ++j) {
                let next_conf = workforce[j];
                while (next_conf.creeps.length < next_conf.max && conf.creeps.length > conf.max) {
                    reassignWorker(conf.creeps, next_conf.creeps, next_conf.role);
                }
            }
        }
    }

    // Refil
    for (let i = 0; i < workforce.length - 1; ++i) {
        let conf = workforce[i];
        if (conf.creeps.length < conf.max) {
            for (let j = workforce.length - 1; j > i; --j) {
                let next_conf = workforce[j];
                while (next_conf.creeps.length > next_conf.min && conf.creeps.length < conf.max) {
                    reassignWorker(next_conf.creeps, conf.creeps, conf.role);
                }
            }
        }
    }
}

WorkforceManager.prototype.recalculateDefaultBody = function() {
    var memory = this.memory;
    var new_body_parts = [];
    var new_body_price = 0;
    var max_body_price = this.room.energyCapacityAvailable;
    for (i in WORKFORCE_BODY_PARTS) {
        if (i % 2 != 1) {
            continue;
        }
        var body_parts = [WORKFORCE_BODY_PARTS[i-1], WORKFORCE_BODY_PARTS[i]];
        var body_parts_price = body_parts.map((part) => BODYPART_COST[part]).reduce((price, part) => price + part, 0);
        if (new_body_price + body_parts_price > max_body_price) {
            break;
        }
        new_body_price += body_parts_price;
        new_body_parts = new_body_parts.concat(body_parts);
    }
    // console.log('new_body_price = ', new_body_price, '/', max_body_price);
    memory.body_parts = new_body_parts;
    memory.body_price = new_body_price;
}
WorkforceManager.prototype.requiredBuilders = function() {
    // TODO: limit based on containers resources if we have containers, otherwise limit by sources (take into account harvesters)
    var memory = this.memory;

    var creep_build_coefficient = memory.body_price / 50;

    var construction_sites = this.room.find(FIND_CONSTRUCTION_SITES);
    if (!construction_sites.length) {
        return memory.required_builders = 0;
    }
    var progress = construction_sites.reduce(function(progress, structure) {
        progress.progressCurrent += structure.progress;
        progress.progressTotal += structure.progressTotal;
        return progress;
    }, { progressCurrent: 0, progressTotal: 0 });

    var required_builders = Math.sqrt((progress.progressTotal - progress.progressCurrent))  / creep_build_coefficient;
    if (required_builders) {
        required_builders = required_builders * BUILDERS_BOOST + 2;
    }
    required_builders = Math.ceil(required_builders);
    
    // return memory.required_builders = Math.max(memory.required_builders, required_builders);
    return memory.required_builders = required_builders;
};
WorkforceManager.prototype.requiredHarveters = function(drainage_active) {
    var room = this.room;
    var memory = this.memory;

    var max_harvesters = this.sources.reduce((total_creeps, source) => {
        var containers = source.pos.findInRange(FIND_STRUCTURES, 10, {filter: (structure) => structure.structureType == STRUCTURE_CONTAINER});
        if (containers.length) {
            return total_creeps + source.maxCreeps();
        }
        return total_creeps + source.clearance;
    }, 0);
    if (this.creeps.length > 7) {
        max_harvesters = Math.min(max_harvesters, Math.floor(0.9 * this.creeps.length));
    }

    // Beginnig or the room
    var energy_capacity = room.energy_capacity;
    if (energy_capacity < 1000) { // we do not yet have containers
        return max_harvesters;
    }

    var energy_available = room.energy_available;
    var required_harvesters = 0;
    var creep_energy_coefficient = memory.body_price / 70;
    if (energy_available < 0.9 * energy_capacity) {
        required_harvesters = Math.sqrt(energy_capacity) / creep_energy_coefficient;
    } else {
        required_harvesters = Math.sqrt(energy_capacity - energy_available) / creep_energy_coefficient;
    }
    required_harvesters = Math.ceil(required_harvesters);
    
    required_harvesters = Math.min(required_harvesters, max_harvesters);
    
    
    // console.log(Game.time, 'required_harvesters', required_harvesters, energy_available, energy_capacity);
    return required_harvesters;
};
WorkforceManager.prototype.requiredUpgraders = function() {
    var room = this.room;

    var required_upgraders = 2 * room.controller.level;
    return required_upgraders;
}
WorkforceManager.prototype.requiredMules = function() {
    var room = this.room;
    let containers = room.find(FIND_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_CONTAINER});
    let energy = 0;
    // 1 mule per 10% of container energy, at most 1 mule per container.
    let mules =  containers.reduce((mules, container) => mules + 10.0 * container.store[RESOURCE_ENERGY] / CONTAINER_CAPACITY, 0);
    mules = Math.min(mules, containers.length);
    mules = Math.ceil(mules);
    return mules;
}
WorkforceManager.prototype.requiredRepairs = function() {
    var room = this.room;
    // TODO: Implement
    return 1;
}

module.exports = WorkforceManager;
