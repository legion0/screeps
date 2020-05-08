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

* Add compound harvesting action that supports withdraw / harvest
* Make server cache write back to tick cache on load from object id
* standard harvester and hauler
* recycleCreep when its job is done, e.g. room builders

## Aspirational TODO

* use segments to sync across servers for server cache (for objects with ids or that implement serialization themselves)
