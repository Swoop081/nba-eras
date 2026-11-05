#!/bin/bash
# Rebuilds one era's ratings from its real stats: skills, usage, production-ranked overall, then the sim fit.
# Usage: tools/rebuild_era.sh <era id> [iterations] [seasons per iteration]
cd "$(dirname "$0")/.."
python3 -I tools/reinit_skills.py "$1" && python3 -I tools/add_usg.py "$1" && python3 -I tools/rank_ovr.py "$1" && \
 NOLOCK=1 KEEPOVR=1 node tools/calibrate.js "$1" "${2:-16}" "${3:-4}" 6 --write
