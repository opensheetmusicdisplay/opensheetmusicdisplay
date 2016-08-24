#!/bin/bash

grunt docs
git clone git@github.com:opensheetmusicdisplay/opensheetmusicdisplay.github.io.git
cd opensheetmusicdisplay.github.io
git status
rsync -a ../build/docs/* ./
git status
git add *
git commit -m "Pushed auto-generated class documentation for $TRAVIS_TAG"
git tag -a $TRAVIS_TAG -m "Class documentation for $TRAVIS_TAG"
git push origin master --follow-tags
echo "Deployed class documentation for $TRAVIS_TAG successfully."
cd ..
rm -rf opensheetmusicdisplay.github.io
