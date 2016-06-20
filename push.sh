#!/usr/bin/env bash
desc="$1"
[ -n "$1" ] || desc="blah blah"
grunt screeps && git add *.js && git reset Gruntfile.js && git commit -m "$desc" && git push
