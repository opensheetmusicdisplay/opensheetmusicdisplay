#!/bin/bash

# Prepare files to be published
npm run build:doc
npm run docs

# Clone github page
git clone git@github.com:opensheetmusicdisplay/opensheetmusicdisplay.github.io.git
cd opensheetmusicdisplay.github.io
git status

# Copy class documentation
rsync -a ../build/docs/* ./classdoc/

# Copy demo application
rsync -a ../build/demo.min.js ./demo/
rm -rf ./demo/sheets
rsync -a ../test/data/* ./demo/sheets/

# Commit and push changes
git status
git add *
git commit -m "Pushed auto-generated class documentation and demo for $TRAVIS_TAG"
git tag -a $TRAVIS_TAG -m "Class documentation and demo for $TRAVIS_TAG"
git push origin master --follow-tags
echo "Deployed class documentation and demo for $TRAVIS_TAG successfully."
cd ..
rm -rf opensheetmusicdisplay.github.io
