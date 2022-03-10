# Screeps

## Setup

```shell
sudo apt update
sudo apt install python2 build-essential

# Install NVM: https://github.com/nvm-sh/nvm#installing-and-updating
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
# Screeps driver requires node version <= 12
nvm install v12.22.10 && nvm use v12.22.10

export PYTHON="$(which python2)"
rm -rf node_modules && npm install
```

## testing

`npx jest` or `npx jest --watch` 

system.setTickDuration(4000)

storage.db['rooms.objects'].update({ type: 'constructionSite' }, { $set: { progress: 2995 }})

storage.db['rooms.objects'].update({room: 'W8N8', type: 'container'}, {$set: {store: {energy: 0}}})

storage.db['rooms.objects'].update({room: 'W8N8', type: 'energy'}, {$set: {energy: 5000}})

storage.db['rooms.objects'].find({room: 'W8N8', type: 'creep', name: 'energyWeb1'})
storage.db['rooms.objects'].update({room: 'W8N8', type: 'creep', name: 'energyWeb1'}, {$set: {ageTime: 119096 - 1300}})

storage.db['rooms.objects'].find({room: 'W8N8', type: 'spawn'})
storage.db['rooms.objects'].update({room: 'W8N8', type: 'spawn'}, {$set: {store: {energy: 300}}})

https://wiki.screepspl.us/index.php/Private_Server_Common_Tasks
https://github.com/techfort/LokiJS/wiki

## TODO

### P0

* Stop using room source and instead select best source taking into account current creep position, otherwise it walks over to the other side of the room just because that container has a little more resource than the container next to it.
* Create a temporary container(s) next to spawn to use as room source until we have a larger storage unit.
* Combat Creep Group to combat first invasion wave.
* Figure out task replacment strategy, when/how does harvester_hauler replace boot task?

### P1

* Enable strict in tsconfig compiler options.
* Figure out why the last pos of a highway isn't used.
* Make sure we don't build new buildings on existing highways, or alternatively delete the highway and create a new one.
* Figure out how to not have creeps idling on a highway.
* Given the dynamic nature of the spawn queue (starvation affecting the end time and hence the priorities and hence the order), abandon the queue implementation and transition to a sorted array, where we can find the best request to fulfill (e.g. when behind schedule look ahead to see if there are urgent requests that should now take priority). Otherwise we end up trying to build an upgrade creep just because at the time of scheduling the timing worked out such that it can be spawned prior to a more urgent creep like a boot creep. And now the boot creep cannot be spawned until we spawn all the upgrade creeps in the queue.
* Do not build highways until later in the game, e.g. containers + controller level 2
* Add additional arguments support to creep actions (e.g. withdraw energy type)
* Clean up how server cache write back to tick cache in get
* Convert highway path in creep memory to standard serialized path and use moveByPath
* Make highway lookup by finding highway endpoint within range of edges, otherwise it creates multiple different highways for very close together destinations, this will also potentially allow to hitch to existing highway from random position without the "from" position.

## Aspirational TODO

* Incorporate simultaneous actions in Action.ts: https://docs.screeps.com/simultaneous-actions.html
* Use segments to sync across servers for server cache (for objects with ids or that implement serialization themselves)
* Have creep spawn requests take in destination position and time and plan creep spawns to arrive at the destination position at the given time.
* Create energy monitoring and slow down or stop actions like controller upgrade or room building if energy reserves are getting low. Ideally we monitor energy change in addition to current available energy.

## Console Commands

* `Memory.logger.printLevel = LogLevel.DEBUG`
* `Memory.logCreepActions = true`
* `Memory.creepSayAction = true` 
* `Memory.creepSayName = true` 
* `Memory.highwayDebugVisuals = true` 
* `Memory.showHighways = true` 
* `Memory.clearHighways = true` 
* `Memory.clearSpawnQueue = true` 
* `Memory.hardReset = true` 
