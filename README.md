# Screeps

## Setup

rm -rf node_modules package-lock.json && npm install

## testing

`npx jest` or `npx jest --watch` 

system.setTickDuration(4000)
storage.db['rooms.objects'].update({ type: 'constructionSite' }, { $set: { progress: 99999 }})
storage.db['rooms.objects'].update({room: 'W7N4', type: 'container'}, {$set: {store: {energy: 0}}})

https://wiki.screepspl.us/index.php/Private_Server_Common_Tasks

## TODO

### P0
* Add build queue to room so room builders only build construction sites in room queue (and not boot containers for example or roads that are maintained by those who walk them)
* Figure out task replacment strategy, when/how does harvester_hauler replace boot task?

### P1
* recycleCreep when its job is done, e.g. room builders
* Make server cache write back to tick cache on load from object id

## Aspirational TODO

* use segments to sync across servers for server cache (for objects with ids or that implement serialization themselves)

## Console Commands

* `Memory.creepSayAction = true`
* `Memory.highwaydebugVisuals = true`
* `Memory.showHighways = true`
* `Memory.hardReset = true`
