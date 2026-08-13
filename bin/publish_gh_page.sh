#!/bin/bash

# Publishes the OSMD demo and class documentation to the opensheetmusicdisplay.github.io
# repository (the public demo at https://opensheetmusicdisplay.github.io/demo/).
#
# The published demo is the SAME application as the local development demo (npm start):
# webpack builds demo/index.html + demo/index.js into build/index.html, build/demo.min.js etc.
# (npm run build), and this script copies that build output together with the demo assets
# (demo.css, resources/) and the sample scores (test/data) into the github.io repository's
# demo/ folder. There is no separately maintained demo UI (demo/index.md) anymore.
#
# Deployment: pushing to master of the github.io repository triggers its Pages workflow
# (.github/workflows/static.yml), which runs a Jekyll build and deploys the site. The demo
# files are copied through unchanged by Jekyll because none of them start with YAML front
# matter (they are treated as static files).
#
# Usage:
#   bin/publish_gh_page.sh
#       Release mode: clones the github.io repository (SSH), copies everything,
#       commits, tags with the current OSMD release tag and pushes.
#   bin/publish_gh_page.sh [--demo-only] /path/to/opensheetmusicdisplay.github.io
#       Local mode: copies into an existing checkout and runs NO git commands,
#       so the changes can be reviewed there and committed/pushed manually.
# Options:
#   --demo-only   Skip building and copying the class documentation (typedoc); only update the demo.

set -e

# Always run from the OSMD repository root (the parent of bin/)
cd "$(dirname "$0")/.."

DEMO_ONLY=0
TARGET=""
for arg in "$@"; do
    case "$arg" in
        --demo-only) DEMO_ONLY=1;;
        *) TARGET="$arg";;
    esac
done

TAG=$(git describe --tags --abbrev=0)

# Prepare files to be published
npm run build
if [ "$DEMO_ONLY" != "1" ]; then
    npm run docs
fi

CLONED=0
if [ -z "$TARGET" ]; then
    if [ -e opensheetmusicdisplay.github.io ]; then
        echo "Error: ./opensheetmusicdisplay.github.io already exists (left over from a failed run?)." >&2
        echo "Remove it, or pass its path as an argument to publish into it without pushing." >&2
        exit 1
    fi
    git clone git@github.com:opensheetmusicdisplay/opensheetmusicdisplay.github.io.git
    TARGET=opensheetmusicdisplay.github.io
    CLONED=1
elif [ ! -e "$TARGET/.git" ]; then
    echo "Error: $TARGET is not a git checkout of opensheetmusicdisplay.github.io" >&2
    exit 1
fi

# Copy class documentation (full replace, so files removed by typedoc do not linger)
if [ "$DEMO_ONLY" != "1" ]; then
    rm -rf "$TARGET/classdoc"
    mkdir -p "$TARGET/classdoc"
    cp -R build/docs/. "$TARGET/classdoc/"
fi

# Copy demo application (full replace, so stale samples/bundles do not linger).
# build/index.html is the webpack-generated demo page (from the demo/index.html template).
# Bundles: demo.min.js (self-contained, includes OSMD) and its lazy-loaded chunks
# (e.g. jsPDF submodules), which are fetched relative to the page at runtime.
# The library-only bundle opensheetmusicdisplay.min.js is not referenced by the demo page
# (see the HtmlWebpackPlugin chunks option in webpack.common.js) and is not published.
rm -rf "$TARGET/demo"
mkdir -p "$TARGET/demo"
cp build/index.html build/favicon.ico "$TARGET/demo/"
shopt -s nullglob
for f in build/*.min.js build/*.LICENSE.txt; do
    case "$(basename "$f")" in
        opensheetmusicdisplay.min.js|opensheetmusicdisplay.min.js.LICENSE.txt) ;;
        *) cp "$f" "$TARGET/demo/";;
    esac
done
shopt -u nullglob
# Demo assets referenced relatively by index.html/demo.css but not emitted by webpack
cp demo/demo.css "$TARGET/demo/"
cp -R demo/resources "$TARGET/demo/resources"
# Sample scores: the top-level files of test/data (subfolders like visual_compare are test-only)
find test/data -maxdepth 1 -type f -exec cp {} "$TARGET/demo/" \;

# Sanity check: every sample filename referenced in demo/index.js must exist in the published demo
node -e '
const fs = require("fs");
const target = process.argv[1];
const src = fs.readFileSync("demo/index.js", "utf8");
const referenced = new Set();
for (const m of src.matchAll(/"([^"\n]+\.(?:xml|musicxml|mxl))"/g)) {
    referenced.add(m[1]);
}
const missing = [...referenced].filter((f) => !fs.existsSync(target + "/demo/" + f));
if (missing.length > 0) {
    console.error("Error: samples referenced in demo/index.js are missing in the published demo:");
    for (const f of missing) { console.error("  " + f); }
    process.exit(1);
}
console.log("Sanity check passed: all " + referenced.size + " samples referenced in demo/index.js are present.");
' "$TARGET"

if [ "$CLONED" = "1" ]; then
    # Commit and push changes
    cd "$TARGET"
    git status
    git add -A
    if git diff --cached --quiet; then
        echo "No changes compared to the published github.io state - nothing to publish."
    else
        git commit -m "Pushed auto-generated class documentation and demo for $TAG"
        # Tag only if this release tag does not exist in the github.io repository yet, so the
        # demo can also be re-published between releases (re-running for an already published
        # release tag must not fail; the tag then stays on the first publish commit).
        if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
            echo "Tag $TAG already exists in the github.io repository - pushing without a new tag."
        else
            git tag -a "$TAG" -m "Class documentation and demo for $TAG"
        fi
        git push origin master --follow-tags
        echo "Deployed class documentation and demo for $TAG successfully."
    fi
    cd ..
    rm -rf opensheetmusicdisplay.github.io
else
    echo "Copied demo$([ "$DEMO_ONLY" != "1" ] && echo " and class documentation") for $TAG into $TARGET."
    echo "No git commands were run there - review the changes and commit/push manually."
fi
