var CONSTANTS = require('constants');
var events = require('events');

var HarvesterRole = require('role.harvester');
var UpgraderRole = require('role.upgrader');
var BuilderRole = require('role.builder');
var MuleRole = require('role.mule');

var HarvesterCreep = require('creep.Harvester');
var UpgraderCreep = require('creep.Upgrader');
var BuilderCreep = require('creep.Builder');

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
        body_parts: [MOVE,WORK, MOVE,CARRY],
        body_price: 250,
        required_builders: 0,
        last_builders_eval: 0,
        required_harvesters: 0,
        last_harvesters_eval: -Infinity,
    };
    return true;
});

function WorkforceManager(room) {
    this.room = room;
    this.memory = room.memory.workforce_manager;
    this.creeps = room.find(FIND_MY_CREEPS, {filter: (creep) => [CONSTANTS.ROLE_HARVESTER, CONSTANTS.ROLE_BUILDER, CONSTANTS.ROLE_UPGRADER, CONSTANTS.ROLE_MULE, null, undefined].indexOf(creep.role) != -1});
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

    var creeps = room.find(FIND_MY_CREEPS, {filter: (creep) => [CONSTANTS.ROLE_HARVESTER, CONSTANTS.ROLE_BUILDER, CONSTANTS.ROLE_UPGRADER, CONSTANTS.ROLE_MULE, null, undefined].indexOf(creep.role) != -1});
    var unemployed = _.filter(creeps, (creep) => creep.role == null);
    var mules = _.filter(creeps, (creep) => creep.role == CONSTANTS.ROLE_MULE);
    var harvesters = _.filter(creeps, (creep) => creep.role == CONSTANTS.ROLE_HARVESTER);
    var builders = _.filter(creeps, (creep) => creep.role == CONSTANTS.ROLE_BUILDER);
    var upgraders = _.filter(creeps, (creep) => creep.role == CONSTANTS.ROLE_UPGRADER);

    while (unemployed.length) {
        var creep = unemployed.pop();
        creep.deleteMemory();
        creep.role = CONSTANTS.ROLE_UPGRADER;
        upgraders.push(creep);
    }

    var required_builders = this.requiredBuilders();
    var required_harvesters = this.requiredHarveters();
    var required_upgraders = this.requiredUpgraders();
    var required_mules = this.requiredMules();
    var required_workforce_size = required_upgraders + required_harvesters + required_builders + required_mules;

    var required_harvesters_old = required_harvesters;
    if (creeps.length < 0.9 * required_workforce_size) {
        // Task additional harvester but do not update required_workforce_size so not to build surplus harvesters
        required_harvesters = this.requiredHarveters(true);
    }

    if (Game.time % 10 == 0) {
        console.log(
            Game.time,
            'builders', builders.length, '/', required_builders,
            'upgraders', upgraders.length, '/', required_upgraders,
            'harvesters', harvesters.length, '/', required_harvesters,
            'mules', mules.length, '/', required_mules,
            'required_harvesters_old', required_harvesters_old);
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

    // Surplus harvesters -> upgraders
    while (harvesters.length > required_harvesters) {
        reassignWorker(harvesters, upgraders, CONSTANTS.ROLE_UPGRADER);
    }
    // Surplus mules -> upgraders
    while (mules.length > required_mules) {
        reassignWorker(mules, upgraders, CONSTANTS.ROLE_UPGRADER);
    }
    // Surplus builders -> upgraders
    while (builders.length > required_builders) {
        reassignWorker(builders, upgraders, CONSTANTS.ROLE_UPGRADER);
    }

    // Harvester < Mule < Builder < Upgrader
    var min_upgraders = 0;
    if (creeps.length > 10 || creeps.length > 2 && this.room.controller.level < 2) {
        min_upgraders = 1;
    }
    // Upgrader > Harvester, Mule, Builder
    while (harvesters.length < required_harvesters && upgraders.length > min_upgraders) {
        reassignWorker(upgraders, harvesters, CONSTANTS.ROLE_HARVESTER);
    }
    while (mules.length < required_mules && upgraders.length > min_upgraders) {
        reassignWorker(upgraders, mules, CONSTANTS.ROLE_MULE);
    }
    while (builders.length < required_builders && upgraders.length > min_upgraders) {
        reassignWorker(upgraders, builders, CONSTANTS.ROLE_BUILDER);
    }

    // Builder > Harvester, Mule
    var min_builders = 0;
    if (creeps.length > 10) {
        min_upgraders = 2;
    }
    while (harvesters.length < required_harvesters && builders.length > min_builders) {
        reassignWorker(builders, harvesters, CONSTANTS.ROLE_HARVESTER);
    }
    while (mules.length < required_mules && builders.length > min_builders) {
        reassignWorker(builders, mules, CONSTANTS.ROLE_MULE);
    }

    // Mule -> Harvester
    var min_mules = 0;
    if (creeps.length > 10) {
        min_mules = 1;
    }
    while (harvesters.length < required_harvesters && mules.length > min_mules) {
        reassignWorker(mules, harvesters, CONSTANTS.ROLE_HARVESTER);
    }

    // TODO: If we have resources in containers than mules are more important than harvesters.
    // upgraders -> mules
    while (mules.length < required_mules && harvesters.length) {
        reassignWorker(harvesters, mules, CONSTANTS.ROLE_MULE);
    }

    harvesters.forEach((creep) => {
        new HarvesterCreep(creep).run();
    });
    upgraders.forEach((creep) => {
        new UpgraderCreep(creep).run();
    });
    builders.forEach((creep) => {
        new BuilderCreep(creep).run();
    });
    mules.forEach((creep) => {
        new MuleRole(creep).run();
    });
};

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

    if (this.creeps.length < 5) {
        return 5;
    }
    // TODO: if not full work at full, if full 2 checks in a row go to 0 and lower check interval;
    if (Game.time - memory.last_harvesters_eval < 5) {
        return memory.required_harvesters;
    }
    memory.last_harvesters_eval = Game.time;
    var energy_available = room.energy_available;
    var energy_capacity = room.energy_capacity;

    var required_harvesters = 0;
    var creep_energy_coefficient = memory.body_price / 70;
    if (drainage_active) {
        required_harvesters = Math.sqrt(energy_capacity) / creep_energy_coefficient;
    } else {
        required_harvesters = Math.sqrt(energy_capacity - energy_available) / creep_energy_coefficient;
    }
    required_harvesters = Math.ceil(required_harvesters);
    required_harvesters += 2;
    
    var max_harvesters = this.sources.reduce((total_clearance, source) => total_clearance + source.clearance, 0) * 2;
    required_harvesters = Math.min(required_harvesters, max_harvesters);
    
    
    // console.log(Game.time, 'required_harvesters', required_harvesters, energy_available, energy_capacity);
    return memory.required_harvesters = required_harvesters;
};
WorkforceManager.prototype.requiredUpgraders = function() {
    var room = this.room;

    var required_upgraders = Math.ceil(2.0 * (8 - room.controller.level));
    required_upgraders = required_upgraders < 1 ? 1 : required_upgraders;
    return required_upgraders;
}
WorkforceManager.prototype.requiredMules = function() {
    var room = this.room;
    var containers = room.find(FIND_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_CONTAINER});
    // var required_mules = Math.ceil(2.0 * (8 - room.controller.level));
    return containers.length;
}

module.exports = WorkforceManager;