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

* Combat Creep Group to combat first invasion wave.
* Figure out task replacment strategy, when/how does harvester_hauler replace boot task?

### P1

* Account for amount withdrawn when calculating container load for withdraw.
* Move highways away from exists, make exists more costly for highway cost matrix.
* Build roads based on server cache creep position heat map.
* Don't search for a highway every single tick, separate cases where there is no highway ending at the target, then there is no point to search again for this target for this time walking there, and cases where there are highways but not from here, then search every N ticks to see if we are near one of them.
* Build highway all the way from source to target, even if we don't use that road for highway navigation, it will get used for regular navigation.
* Make existing highway path cost lower than regular tiles when calculating new highways to reuse existing road segments.
* Replace creepSayName with debugCreepRole with a 2 letter role shorthand (can we use unicode emoji?).
* Enable strict in tsconfig compiler options.
* Figure out why the last pos of a highway isn't used.
* Make sure we don't build new buildings on existing highways, or alternatively delete the highway and create a new one.
* Figure out how to not have creeps idling on a highway.
* Given the dynamic nature of the spawn queue (starvation affecting the end time and hence the priorities and hence the order), abandon the queue implementation and transition to a sorted array, where we can find the best request to fulfill (e.g. when behind schedule look ahead to see if there are urgent requests that should now take priority). Otherwise we end up trying to build an upgrade creep just because at the time of scheduling the timing worked out such that it can be spawned prior to a more urgent creep like a boot creep. And now the boot creep cannot be spawned until we spawn all the upgrade creeps in the queue.
* Do not build highways until later in the game, e.g. containers + controller level 2
* Add additional arguments support to creep actions (e.g. withdraw energy type)
* Clean up how server cache write back to tick cache in get
* Convert highway path in creep memory to standard serialized path and use moveByPath

## Aspirational TODO

* Figure out a better way to check if boot needs to haul to spawn than checking if hauler is alive.
* Incorporate simultaneous actions in Action.ts: https://docs.screeps.com/simultaneous-actions.html
* Use segments to sync across servers for server cache (for objects with ids or that implement serialization themselves)
* Have creep spawn requests take in destination position and time and plan creep spawns to arrive at the destination position at the given time.
* Create energy monitoring and slow down or stop actions like controller upgrade or room building if energy reserves are getting low. Ideally we monitor energy change in addition to current available energy.

## Spawn energy levels

Level 0: 300
Level 1 300
Level 2: 550
Level 3: 800
Level 4: 1300
Level 5: 1800
Level 6: 2300
Level 7: 5300
Level 8: 12300

## Console Commands

* `Memory.logger.printLevel = LogLevel.DEBUG`
* `Memory.logCreepActions = true`
* `Memory.creepSayAction = true`
* `Memory.creepSayName = true`
* `Memory.highwayDebugVisuals = true`
* `Memory.showHighways = true`
* `Memory.clearHighways = true`
* `Memory.disableHighways = true`
* `Memory.clearSpawnQueue = true`
* `Memory.hardReset = true`
