var CONSTANTS = require('constants');
var events = require('events');

var HarvesterCreep = require('creep.Harvester');
var Harvester2Creep = require('creep.Harvester2');
var BootCreep = require('creep.Boot');
var UpgraderCreep = require('creep.Upgrader');
var BuilderCreep = require('creep.Builder');
var MuleCreep = require('creep.Mule');
var RepairCreep = require('creep.Repair');

var WORKFORCE_BODY_PARTS = [WORK,MOVE, CARRY,MOVE, CARRY,MOVE, CARRY,MOVE, WORK,MOVE, CARRY,MOVE, CARRY,MOVE, CARRY,MOVE, WORK,MOVE];
var BUILDERS_BOOST = 0.5;

function WorkforceManager(room) {
    this.room = room;
    this.memory = room.memory.workforce_manager;
    if (this.memory === undefined) {
        this.init_memory();
    }
    this.creeps = room.find(FIND_MY_CREEPS, {filter: (creep) => [
            BootCreep.ROLE,
            CONSTANTS.ROLE_BUILDER,
            CONSTANTS.ROLE_HARVESTER,
            Harvester2Creep.ROLE,
            CONSTANTS.ROLE_MULE,
            CONSTANTS.ROLE_UPGRADER,
            CONSTANTS.ROLE_REPAIR,
        ].indexOf(creep.role) != -1});
    this.sources = room.findSources();
    this.containers = room.findContainers();
}

function reassignWorker(source, target, role_name) {
    var creep = source.pop();
    creep.deleteMemory();
    creep.role = role_name;
    target.push(creep);
}

WorkforceManager.prototype.init_memory = function() {
    var lairs = this.room.findKeeperLairs();
    if (lairs.length > 1) {
        console.log('ERROR ERROR ERROR ERROR ERROR', 'Found too many lairs', lairs.length);
    }
    if (lairs.length) {
        var lair = lairs[0];
        var source = lair.pos.findClosestByRange(FIND_SOURCES);
        if (source) {
            this.room.memory.lair_source_id = source.id;
        }
    }

    this.memory = this.room.memory.workforce_manager = {
        body_parts: [WORK,MOVE, CARRY,MOVE],
        body_price: 250,
        required_builders: 0,
        last_builders_eval: 0,
    };
}

WorkforceManager.prototype.spawn_creeps = function(required_workforce_size) {
    let room = this.room;
    let memory = this.memory;
    var spawn_creep_by_name = (name, body, memory) => {
        var spawns = room.find(FIND_MY_SPAWNS);
        for (i in spawns) {
            var spawn = spawns[i];
            var name_or_error = spawn.createCreep(body, name, memory);
            if (_.isString(name_or_error)) {
                return OK;
            }
            return name_or_error;
        }
    }
    //TODO: prefer building 1 complete chain (preferably a weak one if im out completely) and not 2 harvesters
    for (let source of this.sources) {
        if (source.container) {
            let name = 'harvester_' + source.id;
            if (!Game.creeps[name]) {
                let body =  room.truncate_body(Harvester2Creep.BODY_PARTS);
                spawn_creep_by_name(name, body, {'role': Harvester2Creep.ROLE, 'source': source.id, 'target': source.container.id});
                // TODO: generic code to not override creep creation
                return;
            }
        } else {
            for (let i = 0; i < source.clearance; i++) {
                if (i > 2) { // max 3 creeps per source
                    break;
                }
                let name = 'harvester_' + source.id + '_' + i;
                if (!Game.creeps[name]) {
                    let spawn = room.find(FIND_MY_SPAWNS)[0];
                    spawn_creep_by_name(name, BootCreep.BODY_PARTS, {'role': BootCreep.ROLE, 'source': source.id, 'target': spawn.id, 'spawn': spawn.id});
                    return;
                }

            }
        }
    }
    for (let container of this.containers) {
        let name = 'mule_' + container.id;
        if (!Game.creeps[name]) {
            let body =  room.truncate_body(MuleCreep.BODY_PARTS);
            spawn_creep_by_name(name, body, {'role': MuleCreep.ROLE, 'source': container.id});
            return;
        }
    }
    if (this.room.storage) {
        let name = 'mule_' + this.room.name;
        if (!Game.creeps[name]) {
            let body =  room.truncate_body(MuleCreep.BODY_PARTS);
            spawn_creep_by_name(name, body, {'role': MuleCreep.ROLE, 'source': this.room.storage.id});
            return;
        }
    }

    var builders = _.filter(this.creeps, (creep) => creep.role == CONSTANTS.ROLE_BUILDER);
    var repairs = _.filter(this.creeps, (creep) => creep.role == CONSTANTS.ROLE_REPAIR);
    var upgraders = _.filter(this.creeps, (creep) => creep.role == CONSTANTS.ROLE_UPGRADER);

    if (builders.length + repairs.length + upgraders.length < required_workforce_size && room.energyAvailable >= memory.body_price) {
        var spawns = room.find(FIND_MY_SPAWNS);
        var new_creep_count = 0;
        for (i in spawns) {
            var spawn = spawns[i];
            var new_name = spawn.createCreep(memory.body_parts, undefined, {'role': CONSTANTS.ROLE_UPGRADER});
            if (_.isString(new_name)) {
                // console.log('Created new Spawn', new_name);
                ++new_creep_count;
                if (this.creeps.length + new_creep_count == required_workforce_size) {
                    break;
                }
            }
        }
    }
}

WorkforceManager.prototype.run = function() {
    var room = this.room;
    var memory = this.memory;

    // if (!room.controller.my) {
    //     return;
    // }

    if (Game.time % 50 == 0) {
        this.recalculateDefaultBody();
    }

    var creeps = this.creeps;
    var boot = _.filter(creeps, (creep) => creep.role == BootCreep.ROLE);
    var harvesters2 = _.filter(creeps, (creep) => creep.role == Harvester2Creep.ROLE);
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
    var required_workforce_size = required_builders + required_repairs + required_upgraders;

    if (Game.time % 10 == 0) {
        console.log(
            Game.time,
            'mules', mules.length, '/', required_mules,
            'harvesters', harvesters.length + harvesters2.length, '/', required_harvesters,
            'repairs', repairs.length, '/', required_repairs,
            'builders', builders.length, '/', required_builders,
            'upgraders', upgraders.length, '/', required_upgraders);
    }

    if (room.controller.my && (!Game.flags.attack || Game.creeps.a)) {
        this.spawn_creeps(required_workforce_size);
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
    var min_upgraders = this.minUpgraders();

    this._rebalanceWorkforce([
            {
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
    if (creeps.length < 0.7 * required_workforce_size) {
        mule_prefer_spawns = true;
    }


    boot.forEach((creep) => {
        new BootCreep(creep).run();
    });
    harvesters2.forEach((creep) => {
        new Harvester2Creep(creep).run();
    });
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
    console.log('new_body_price', new_body_price, 'max_body_price', max_body_price, 'new_body_parts.length', new_body_parts.length);
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
    required_builders = Math.min(required_builders, 6);
    // return memory.required_builders = Math.max(memory.required_builders, required_builders);
    return memory.required_builders = Math.ceil(required_builders);
};
WorkforceManager.prototype.requiredHarveters = function(drainage_active) {
    return 0;
    var room = this.room;
    var memory = this.memory;

    var required_harvesters = memory.required_harvesters;
    if (required_harvesters === undefined) {
        required_harvesters = memory.required_harvesters = 5;
    }
    if (Game.time % 50 != 0) {
        return required_harvesters;
    }

    var max_harvesters = this.sources.reduce((total_creeps, source) => total_creeps + source.max_creeps, 0);

    var energy_capacity = room.energy_capacity;
    var energy_available = room.energy_available;
    if (energy_capacity < 1000 || energy_available < 0.9 * energy_capacity) {
        // we do not yet have containers or low on energy
        required_harvesters = max_harvesters;
    } else {
        required_harvesters = (1 - energy_available / energy_capacity) * max_harvesters;
    }

    // console.log(Game.time, 'required_harvesters', required_harvesters, energy_available, energy_capacity);
    memory.required_harvesters = Math.ceil(required_harvesters)
    return memory.required_harvesters;
};
WorkforceManager.prototype.requiredUpgraders = function() {
    return 1;
    let room = this.room;

    let required_upgraders = 2 * room.controller.level;

    return required_upgraders;
}

WorkforceManager.prototype.minUpgraders = function() {
    var room = this.room;

    if (this.creeps.length > 5 && (room.controller.ticksToDowngrade < 500 || this.memory.downgrade_started)) {
        if (room.controller.ticksToDowngrade > 900) {
            this.memory.downgrade_started = false;
            return 0;
        }
        this.memory.downgrade_started = true;
        return 1;
    }
    return 0;
}

WorkforceManager.prototype.requiredMules = function() {
    return 0;
    var room = this.room;
    let containers = room.find(FIND_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_CONTAINER});
    let energy = 0;
    // 1 mule per 10% of container energy, at most 1 mule per container.
    let mules =  containers.reduce((mules, container) => mules + 10.0 * container.store[RESOURCE_ENERGY] / CONTAINER_CAPACITY, 0);
    mules = Math.min(mules, containers.length);
    return Math.ceil(mules);
}
WorkforceManager.prototype.requiredRepairs = function() {
    return 0;
    var room = this.room;

    let damaged_walls = room.find(FIND_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_WALL && structure.hits < structure.hitsMax});
    let very_damaged_walls = damaged_walls.filter((wall) => wall.hits < 0.001 * wall.hitsMax);

    let repairs = 0;
    if (very_damaged_walls.length) {
        // TODO: per room memory parameter;
        repairs = 3;
    } else if (damaged_walls.length) {
        repairs = 1;
    }

    return Math.ceil(repairs);
}

module.exports = WorkforceManager;
