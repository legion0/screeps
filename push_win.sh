#usr/bin/env bash

set -euo pipefail

WIN_DST_DIR="/mnt/c/Users/pheni/AppData/Local/Screeps/scripts/127_0_0_1___21025/default"

if test -d "${WIN_DST_DIR}"; then
	npx tsc
	npx rollup --config
	rm -f "${WIN_DST_DIR}"/*.js
	cp dist/*.js "${WIN_DST_DIR}"
	rm -f src/*.js
fi
