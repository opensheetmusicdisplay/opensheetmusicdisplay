#!/bin/bash

# Create releases directory
mkdir -p releases
cd releases

# Get version from package.json
VERSION=$(node -p "require('../package.json').version")

# Create package.json with dynamic version
cat > package.json << EOF
{
  "name": "opensheetmusicdisplay",
  "version": "$VERSION",
  "description": "An open source JavaScript engine for displaying MusicXML based on VexFlow.",
  "main": "opensheetmusicdisplay.min.js",
  "types": "dist/src/index.d.ts",
  "files": [
    "opensheetmusicdisplay.min.js",
    "opensheetmusicdisplay.min.js.LICENSE.txt",
    "dist/"
  ],
  "keywords": [
    "sheet",
    "music",
    "vexflow",
    "musicxml"
  ],
  "author": "PhonicScore",
  "license": "BSD-3-Clause"
}
EOF

# Copy built files
cp ../build/opensheetmusicdisplay.min.js ../build/opensheetmusicdisplay.min.js.LICENSE.txt .
cp -r ../build/dist .

# Create package
npm pack

# Clean up
rm -rf package.json opensheetmusicdisplay.min.js opensheetmusicdisplay.min.js.LICENSE.txt dist
