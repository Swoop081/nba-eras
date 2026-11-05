#!/bin/bash
# Re-ranks one era's overall by production and refits the sim (skills and usage already built by rebuild_era.sh)
cd "$(dirname "$0")/.."
python3 -I tools/rank_ovr.py "$1" && NOLOCK=1 KEEPOVR=1 node tools/calibrate.js "$1" "${2:-12}" "${3:-3}" 6 --write
