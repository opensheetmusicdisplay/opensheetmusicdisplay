

# Commit and push changes
git status
git add *
git commit -m "Pushed auto-generated class documentation and demo for $TRAVIS_TAG"
git tag -a $TRAVIS_TAG -m "Class documentation and demo for $TRAVIS_TAG"
git push origin master --follow-tags
echo "Deployed class documentation and demo for $TRAVIS_TAG successfully."
cd ..
rm -rf opensheetmusicdisplay.github.io
