#!/bin/bash
# Prepares test/performance/browserBenchWork/ for the bench pages (browserBench*.html): the OSMD builds to compare, the scores, the pages and the runner.
# Run from the repository root after `npm install` (which builds build/opensheetmusicdisplay.min.js of this checkout).
# Builds: v221 = OSMD 2.2.1 from npm; dev = this checkout; devAA = a copy of dev (A/A control: the noise of the pairing);
#   devAppKeep = another copy of dev, with an app-level warm keeper in browserBenchClearIdle.html (see there).
set -e
WORK=test/performance/browserBenchWork
rm -rf "$WORK"
mkdir -p "$WORK/scores" "$WORK/npm221"
(cd "$WORK/npm221" && npm pack opensheetmusicdisplay@2.2.1 --silent > /dev/null && tar xzf opensheetmusicdisplay-2.2.1.tgz)
cp "$WORK/npm221/package/build/opensheetmusicdisplay.min.js" "$WORK/osmd-v221.min.js"
cp build/opensheetmusicdisplay.min.js "$WORK/osmd-dev.min.js"
cp build/opensheetmusicdisplay.min.js "$WORK/osmd-devAA.min.js"
cp build/opensheetmusicdisplay.min.js "$WORK/osmd-devApp.min.js"
# the 21 scores of issue #1716 (browserBenchWarm.html) and the 6 of browserBenchClearIdle.html are in test/data
for score in $(grep -ho '"[^"]*\.\(xml\|musicxml\)"' test/performance/browserBenchWarm.html test/performance/browserBenchClearIdle.html | tr -d '"' | sort -u); do
    if [ -f "test/data/$score" ]; then
        cp "test/data/$score" "$WORK/scores/"
    fi
done
cp test/performance/browserBenchScores/* "$WORK/scores/"
cp test/performance/browserBenchWarm.html test/performance/browserBenchClearIdle.html test/performance/browserBench.mjs "$WORK/"
echo "[[\"v221\",\"osmd-v221.min.js\"],[\"dev\",\"osmd-dev.min.js\"],[\"devAA\",\"osmd-devAA.min.js\"]]" > "$WORK/builds-warm.json"
echo "[[\"v221\",\"osmd-v221.min.js\"],[\"dev\",\"osmd-dev.min.js\"],[\"devAA\",\"osmd-devAA.min.js\"],[\"devAppKeep\",\"osmd-devApp.min.js\",{\"__appKeeper\":\"OSMD_function_test_warm_keeper.musicxml\"}]]" > "$WORK/builds-clearidle.json"
ls -la "$WORK" "$WORK/scores" | head -40
