#!/bin/bash
# Visual A/B: renders the full sample corpus with the working tree ("new") and with src/ changes
# stashed (baseline, e.g. develop, "base"), then compares all images pixel-wise.
# Run from the repository root: bash test/performance/runVisualAB.sh
# Output: export/ab_new/, export/ab_base/, export/ab_compare.log (+ *_DIFF.png overlays in ab_new).
set -e
cd "$(git rev-parse --show-toplevel)"

STASHED=0
cleanup() {
    if [ "$STASHED" = "1" ]; then
        echo "!!! failure while src/ was stashed - restoring stashed changes..."
        git stash pop || echo "!!! 'git stash pop' failed, restore manually (see git stash list: visualAB-temp)"
    fi
}
trap cleanup ERR

echo "=== building + rendering NEW (working tree) ==="
npx webpack --config webpack.dev.js > /dev/null
cp build/opensheetmusicdisplay.js build/opensheetmusicdisplay.min.js
node ./test/Util/generateImages_browserless.mjs ../../build ./test/data ./export/ab_new png 0 0 all --osmdtesting > export/ab_new.log 2>&1

echo "=== stashing src changes, building + rendering BASELINE ==="
git stash push -m "visualAB-temp" -- src/
STASHED=1
npx webpack --config webpack.dev.js > /dev/null
cp build/opensheetmusicdisplay.js build/opensheetmusicdisplay.min.js
node ./test/Util/generateImages_browserless.mjs ../../build ./test/data ./export/ab_base png 0 0 all --osmdtesting > export/ab_base.log 2>&1

echo "=== restoring working tree + rebuilding ==="
git stash pop
STASHED=0
npx webpack --config webpack.dev.js > /dev/null
cp build/opensheetmusicdisplay.js build/opensheetmusicdisplay.min.js

echo "=== comparing ==="
node test/performance/compareImages.mjs export/ab_base export/ab_new 24 12 > export/ab_compare.log 2>&1 || true
echo "=== done, see export/ab_compare.log ==="
