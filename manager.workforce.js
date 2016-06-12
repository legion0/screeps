var CONSTANTS = require('constants');
var events = require('events');

var HarvesterRole = require('role.harvester');
var UpgraderRole = require('role.upgrader');
var BuilderRole = require('role.builder');
var MuleRole = require('role.mule');

var WORKFORCE_BODY_PARTS = [WORK,CARRY,MOVE,MOVE, MOVE,WORK, MOVE,CARRY, MOVE,WORK, MOVE,WORK];

events.listen(CONSTANTS.EVENT_ROOM_DISCOVERED, (event_name, roomName) => {
    // console.log('WorkforceManager', 'EVENT_ROOM_DISCOVERED', roomName);
    var room = Game.rooms[roomName];
    var memory = Memory.rooms[roomName];

    room.findSources().forEach((source) => {
        // TODO: save clearance
    });
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
        body_price: 250
    };
    return true;
});

function WorkforceManager(room) {
    this.room = room;
    this.memory = room.memory.workforce_manager;
    this.construction_sites = room.find(FIND_CONSTRUCTION_SITES);
}
WorkforceManager.prototype.run = function() {
    var room = this.room;
    var memory = this.memory;

    this.recalculateDefaultBody();

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

    if (Game.time % 50 == 0) {
        console.log(
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
        var creep = harvesters.pop();
        creep.deleteMemory();
        creep.role = CONSTANTS.ROLE_UPGRADER;
        upgraders.push(creep);
    }
    // Surplus builders -> upgraders
    while (builders.length > required_builders) {
        var creep = builders.pop();
        creep.deleteMemory();
        creep.role = CONSTANTS.ROLE_UPGRADER;
        upgraders.push(creep);
    }
    // Surplus mules -> upgraders
    while (mules.length > required_mules) {
        var creep = mules.pop();
        creep.deleteMemory();
        creep.role = CONSTANTS.ROLE_UPGRADER;
        upgraders.push(creep);
    }

    var min_upgraders = 1;
    // upgraders -> harvesters
    while (harvesters.length < required_harvesters && upgraders.length > min_upgraders) {
        var creep = upgraders.pop();
        creep.deleteMemory();
        creep.role = CONSTANTS.ROLE_HARVESTER;
        harvesters.push(creep);
    }
    // upgraders -> mules
    while (mules.length < required_mules && upgraders.length > min_upgraders) {
        var creep = upgraders.pop();
        creep.deleteMemory();
        creep.role = CONSTANTS.ROLE_MULE;
        mules.push(creep);
    }
    // upgraders -> builders
    while (builders.length < required_builders && upgraders.length > min_upgraders) {
        var creep = upgraders.pop();
        creep.deleteMemory();
        creep.role = CONSTANTS.ROLE_BUILDER;
        builders.push(creep);
    }

    harvesters.forEach((creep) => {
        new HarvesterRole(creep).run();
    });
    upgraders.forEach((creep) => {
        new UpgraderRole(creep).run();
    });
    builders.forEach((creep) => {
        new BuilderRole(creep).run();
    });
    mules.forEach((creep) => {
        new MuleRole(creep).run();
    });
};

WorkforceManager.prototype.recalculateDefaultBody = function() {
    if (Game.time % 50 != 0) {
        return;
    }
    var memory = this.memory;
    var all_body_parts = memory.all_body_parts;
    var body_parts = memory.body_parts = [];
    var body_price = 0;
    var max_body_price = this.room.energyCapacityAvailable * 0.85;
    for (i in WORKFORCE_BODY_PARTS) {
        var body_part = WORKFORCE_BODY_PARTS[i];
        var new_body_price = body_price + BODYPART_COST[body_part];
        if (new_body_price > max_body_price) {
            break;
        }
        body_price = new_body_price;
        body_parts.push(body_part);
    }
    console.log('body_price = ', body_price, '/', max_body_price, '/', this.room.energyCapacityAvailable);
    memory.body_price = body_price;
}
WorkforceManager.prototype.requiredBuilders = function() {
    var memory = this.memory;

    var creep_build_coefficient = memory.body_price / 50;

    if (!this.construction_sites.length) {
        return memory.required_builders = 0;
    }
    var progress = this.construction_sites.reduce(function(progress, structure) {
        progress.progressCurrent += structure.progress;
        progress.progressTotal += structure.progressTotal;
        return progress;
    }, { progressCurrent: 0, progressTotal: 0 });

    var required_builders = Math.sqrt((progress.progressTotal - progress.progressCurrent))  / creep_build_coefficient;
    required_builders = Math.ceil(required_builders);
    
    return memory.required_builders = Math.max(memory.required_builders, required_builders);
};
WorkforceManager.prototype.requiredHarveters = function(drainage_active) {
    var room = this.room;
    var memory = this.memory;

    var energyCapacityAvailable = room.energyCapacityAvailable;
    var energyAvailable = room.energyAvailable;
    room.find(FIND_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_CONTAINER}).forEach((container) => {
        energyCapacityAvailable += container.storeCapacity / 3.0;
        energyAvailable += _.sum(container.store) / 3.0;
    });

    var required_harvesters = 0;
    if (drainage_active) {
        var creep_energy_coefficient = (memory.body_price / 3.5);
        required_harvesters = energyCapacityAvailable / creep_energy_coefficient;
    } else {
        var creep_energy_coefficient = (memory.body_price / 2.0);
        required_harvesters = (energyCapacityAvailable - energyAvailable)  / creep_energy_coefficient;
    }
    required_harvesters = Math.ceil(required_harvesters);
    return required_harvesters;
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
