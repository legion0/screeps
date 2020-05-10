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
* Make highway lookup by finding highway endpoint within range of edges, otherwise it creates multiple different highways for very close together destinations, this will also potentially allow to hick to existing highway from random position without the "from" position.
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
* `Memory.hardReset = true`
