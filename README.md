# Screeps

## Setup

rm -rf node_modules package-lock.json && npm install

## testing

`npx jest` or `npx jest --watch` 

system.setTickDuration(4000)

storage.db['rooms.objects'].update({ type: 'constructionSite' }, { $set: { progress: 2995 }})

storage.db['rooms.objects'].update({room: 'W7N7', type: 'container'}, {$set: {store: {energy: 0}}})

storage.db['rooms.objects'].update({room: 'W7N7', type: 'energy'}, {$set: {energy: 5000}})

storage.db['rooms.objects'].find({room: 'W7N7', type: 'creep', name: 'energyWeb1'})
storage.db['rooms.objects'].update({room: 'W7N7', type: 'creep', name: 'energyWeb1'}, {$set: {ageTime: 119096 - 1300}})

storage.db['rooms.objects'].find({room: 'W7N7', type: 'spawn'})
storage.db['rooms.objects'].update({room: 'W7N7', type: 'spawn'}, {$set: {store: {energy: 298}}})

https://wiki.screepspl.us/index.php/Private_Server_Common_Tasks
https://github.com/techfort/LokiJS/wiki

## TODO

### P0

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
* `Memory.highwayDebugVisuals = true` 
* `Memory.showHighways = true` 
* `Memory.clearHighways = true` 
* `Memory.clearSpawnQueue = true` 
* `Memory.hardReset = true` 
