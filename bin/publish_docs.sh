#!/bin/bash

git clone git@github.com:opensheetmusicdisplay/opensheetmusicdisplay.github.io.git
rsync -a ./build/docs ./opensheetmusicdisplay.github.io.git
git status
git add *
git commit -m "Pushed auto-generated class documentation for $TRAVIS_TAG"
git tag -a $TRAVIS_TAG -m "Class documentation for $TRAVIS_TAG"
git push origin master --follow-tags
