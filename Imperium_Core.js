// IMPERIUM CORE v1.0
// A consolidated Screeps Colony Manager designed for autonomous expansion.

// --- CONFIGURATION ---
const TARGET_POPULATION = {
    harvester: 2,   // Maintain energy supply
    upgrader: 3,    // Rush Room Controller levels
    builder: 2,     // Construct infrastructure
    repairer: 1,    // Maintain roads/walls
    defender: 1     // Basic melee defense
};

// Body Part Configurations based on energy available
// [WORK, CARRY, MOVE] is the basic 200 energy unit
const TIER_1_BODY = [WORK, CARRY, MOVE]; 
const TIER_2_BODY = [WORK, WORK, CARRY, CARRY, MOVE, MOVE]; 
const DEFENDER_BODY = [TOUGH, TOUGH, ATTACK, ATTACK, MOVE, MOVE];

// --- MAIN LOOP ---
module.exports.loop = function () {

    // 1. MEMORY CLEANUP
    // Clear memory of dead creeps to save CPU and avoid ghost data
    for(var name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('💀 [CASUALTY REPORT] Clearing memory for:', name);
        }
    }

    // 2. TOWER LOGIC (Defense & Repair)
    // Scan all rooms we own
    for (let roomName in Game.rooms) {
        let room = Game.rooms[roomName];
        let towers = room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_TOWER }
        });

        towers.forEach(tower => {
            // Priority 1: Attack Hostiles
            let closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
            if(closestHostile) {
                tower.attack(closestHostile);
            } else {
                // Priority 2: Repair critical structures if energy is decent
                if (tower.store.getUsedCapacity(RESOURCE_ENERGY) > 500) {
                    let closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: (structure) => structure.hits < structure.hitsMax && structure.structureType != STRUCTURE_WALL
                    });
                    if(closestDamagedStructure) {
                        tower.repair(closestDamagedStructure);
                    }
                }
            }
        });
    }

    // 3. SPAWN LOGIC (The Factory)
    let spawn = Game.spawns['Spawn1']; // Assumes default spawn name
    if (spawn) {
        spawnNewCreeps(spawn);
        
        // Visual indicator of spawning
        if(spawn.spawning) { 
            var spawningCreep = Game.creeps[spawn.spawning.name];
            spawn.room.visual.text(
                '🛠️ ' + spawningCreep.memory.role,
                spawn.pos.x + 1, 
                spawn.pos.y, 
                {align: 'left', opacity: 0.8});
        }
    }

    // 4. CREEP EXECUTION
    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        
        // Run specific role logic
        if(creep.memory.role == 'harvester') roleHarvester(creep);
        if(creep.memory.role == 'upgrader') roleUpgrader(creep);
        if(creep.memory.role == 'builder') roleBuilder(creep);
        if(creep.memory.role == 'repairer') roleRepairer(creep);
        if(creep.memory.role == 'defender') roleDefender(creep);
    }
}

// --- SPAWNER CONTROLLER ---
function spawnNewCreeps(spawn) {
    // Count existing roles
    let census = { harvester: 0, upgrader: 0, builder: 0, repairer: 0, defender: 0 };
    for(let name in Game.creeps) {
        let role = Game.creeps[name].memory.role;
        if (census[role] !== undefined) census[role]++;
    }

    // Spawn Priority: Harvesters -> Defenders -> Upgraders -> Builders
    if(census.harvester < TARGET_POPULATION.harvester) {
        spawnUnit(spawn, 'harvester', TIER_1_BODY);
    } else if (census.defender < TARGET_POPULATION.defender && spawn.room.find(FIND_HOSTILE_CREEPS).length > 0) {
        // Only spawn defender if enemies are present or under pop cap
        spawnUnit(spawn, 'defender', DEFENDER_BODY);
    } else if(census.upgrader < TARGET_POPULATION.upgrader) {
        spawnUnit(spawn, 'upgrader', TIER_1_BODY);
    } else if(census.builder < TARGET_POPULATION.builder) {
        spawnUnit(spawn, 'builder', TIER_1_BODY);
    } else if(census.repairer < TARGET_POPULATION.repairer) {
        spawnUnit(spawn, 'repairer', TIER_1_BODY);
    }
}

function spawnUnit(spawn, role, body) {
    // Check if we can afford a bigger body
    let energy = spawn.room.energyAvailable;
    let actualBody = body;
    
    // Very basic auto-scaling (add logic here to construct bigger bodies later)
    if (energy >= 400 && role !== 'defender') actualBody = TIER_2_BODY;

    if(spawn.spawnCreep(actualBody, role + '_' + Game.time, {dryRun: true}) === OK) {
        spawn.spawnCreep(actualBody, role + '_' + Game.time, {memory: {role: role}});
        console.log(`[PRODUCTION] Spawning new ${role}`);
    }
}

// --- ROLE DEFINITIONS ---

// 1. HARVESTER: Finds source, fills self, fills Spawn/Extension
function roleHarvester(creep) {
    if(creep.store.getFreeCapacity() > 0) {
        // Go gather
        var sources = creep.room.find(FIND_SOURCES);
        // Dumb assignment: Harvester 0 goes to Source 0, etc. (Improve with memory mapping)
        if(creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
            creep.moveTo(sources[0], {visualizePathStyle: {stroke: '#ffaa00'}});
        }
    }
    else {
        // Deliver
        var targets = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) &&
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });
        if(targets.length > 0) {
            if(creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
            }
        } else {
            // If spawn is full, help build or upgrade (don't sit idle)
            roleBuilder(creep); 
        }
    }
}

// 2. UPGRADER: Siphons energy to the Room Controller
function roleUpgrader(creep) {
    // State machine: if upgrading and empty, switch to harvest. If harvesting and full, switch to upgrade.
    if(creep.memory.upgrading && creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.upgrading = false;
        creep.say('🔄 harvest');
    }
    if(!creep.memory.upgrading && creep.store.getFreeCapacity() == 0) {
        creep.memory.upgrading = true;
        creep.say('⚡ upgrade');
    }

    if(creep.memory.upgrading) {
        if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
        }
    }
    else {
        var sources = creep.room.find(FIND_SOURCES);
        if(creep.harvest(sources[1] || sources[0]) == ERR_NOT_IN_RANGE) {
            creep.moveTo(sources[1] || sources[0], {visualizePathStyle: {stroke: '#ffaa00'}});
        }
    }
}

// 3. BUILDER: Constructs buildings placed by the player
function roleBuilder(creep) {
    if(creep.memory.building && creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.building = false;
        creep.say('🔄 harvest');
    }
    if(!creep.memory.building && creep.store.getFreeCapacity() == 0) {
        creep.memory.building = true;
        creep.say('🚧 build');
    }

    if(creep.memory.building) {
        var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
        if(targets.length) {
            if(creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
            }
        } else {
            // If nothing to build, go upgrade
            roleUpgrader(creep);
        }
    }
    else {
        var sources = creep.room.find(FIND_SOURCES);
        if(creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
            creep.moveTo(sources[0], {visualizePathStyle: {stroke: '#ffaa00'}});
        }
    }
}

// 4. REPAIRER: Maintains roads and containers
function roleRepairer(creep) {
    if(creep.memory.repairing && creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.repairing = false;
        creep.say('🔄 harvest');
    }
    if(!creep.memory.repairing && creep.store.getFreeCapacity() == 0) {
        creep.memory.repairing = true;
        creep.say('🔧 repair');
    }

    if(creep.memory.repairing) {
        // Find damaged roads or containers
        const targets = creep.room.find(FIND_STRUCTURES, {
            filter: object => object.hits < object.hitsMax && object.structureType !== STRUCTURE_WALL
        });

        targets.sort((a,b) => a.hits - b.hits); // Prioritize lowest health

        if(targets.length > 0) {
            if(creep.repair(targets[0]) == ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[0]);
            }
        } else {
            roleBuilder(creep); // No repairs? Build stuff.
        }
    } else {
        var sources = creep.room.find(FIND_SOURCES);
        if(creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
            creep.moveTo(sources[0]);
        }
    }
}

// 5. DEFENDER: Attacks hostile creeps
function roleDefender(creep) {
    const target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if(target) {
        if(creep.attack(target) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target);
        }
    } else {
        // Patrol near spawn
        creep.moveTo(Game.spawns['Spawn1'].pos.x, Game.spawns['Spawn1'].pos.y + 5);
    }
}
