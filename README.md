# Screeps

## Setup

```shell
sudo apt update
sudo apt install python2 build-essential

Install NVM: https://github.com/nvm-sh/nvm#installing-and-updating
# Screeps driver requires node version <= 12
nvm install v12.22.10 && nvm use v12.22.10

export PYTHON="$(which python2)"
rm -rf node_modules && npm install
```

## testing

`npx jest` or `npx jest --watch` 

system.setTickDuration(4000)

storage.db['rooms.objects'].update({ type: 'constructionSite' }, { $set: { progress: 2999 }})

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

* Do not build highways until later in the game, e.g. containers + controller level 2
* Make spawning body dynamic so we can downgrade the body in case the spawn is starved for resources for a prolonged period of time (e.g. all creeps are dead and no one is going to fill the extensions).

* Make highway lookup by finding highway endpoint within range of edges, otherwise it creates multiple different highways for very close together destinations, this will also potentially allow to hick to existing highway from random position without the "from" position.
* Build energy request system
* Figure out task replacment strategy, when/how does harvester_hauler replace boot task?

### P1

* Add additional arguments support to creep actions (e.g. withdraw energy type)
* Clean up how server cache write back to tick cache in get
* Convert highway path in creep memory to standard serialized path and use moveByPath

## Aspirational TODO

* Incorporate simultaneous actions in Action.ts: https://docs.screeps.com/simultaneous-actions.html
* Use segments to sync across servers for server cache (for objects with ids or that implement serialization themselves)
* Have creep spawn requests take in destination position and time and plan creep spawns to arrive at the destination position at the given time.

## Console Commands

* `Memory.creepSayAction = true` 
* `Memory.creepSayName = true` 
* `Memory.highwayDebugVisuals = true` 
* `Memory.showHighways = true` 
* `Memory.clearHighways = true` 
* `Memory.clearSpawnQueue = true` 
* `Memory.hardReset = true` 
