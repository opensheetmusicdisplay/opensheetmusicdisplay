#!/bin/bash
# This script runs a visual regression test on all the images
# generated from OSMD samples (npm run generate:current and npm run generate:blessed)
#
#   inspired by and adapted from Vexflow's visual regression tests.
#
# Prerequisites: ImageMagick
#
# On OSX:   $ brew install imagemagick
# On Linux: $ apt-get install imagemagick
#
# Usage:
#
#
#  First generate the known good or previous state PNG images you want to compare to, e.g. the develop branch or last release:
#
#    npm run generate:blessed
#
#  Make changes in OSMD, then generate your new images:
#
#    npm run generate:current
#
#  Run the regression tests against the blessed images in visual_regression/blessed.
#
#    npm run test:visual
#    # npm will navigate to the base folder automatically
#
#    # or: (this should be done from the main OSMD folder)
#    # sh test/Util/visual_regression.sh [imageBaseFolder] [sampleShellPrefix]
#    #    example: sh test/Util/visual_regression.sh ./visual_regression OSMD_function_test_
#    #        will run visual regression tests for all images matching OSMD_function_test_*.png.
#
#  Check visual_regression/diff/results.txt for results. This file is sorted
#  by PHASH difference (most different files on top.) The composite diff
#  images for failed tests (i.e., PHASH > 1.0) are stored in visual_regression/diff.
#
#  (If you are satisfied with the differences, copy *.png from visual_regression/current
#  into visual_regression/blessed, and submit your change (TODO))

# PNG viewer on OSX. Switch this to whatever your system uses.
# VIEWER=open

# Show images over this PHASH threshold.
# 0.01 is probably too low, but a good first pass.
# 0.0001 catches for example a repetition ending not having a down line at the end (see Saltarello bar 10) (0.001 doesn't catch this)
# 0.0000001 (6 0s after the dot) catches e.g. a chord symbol moving about 3 pixels to the right (on a canvas of ~1450px width)
THRESHOLD=0.00000001

# Set up Directories
#   It does not matter where this script is executed, as long as these folders are given correctly (and blessed/current have png images set up correctly)
BUILDFOLDER=./visual_regression
if [ "$1" != "" ]
then
  BUILDFOLDER=$1
fi
BLESSED=$BUILDFOLDER/blessed
CURRENT=$BUILDFOLDER/current
DIFF=$BUILDFOLDER/diff
# diff also acts as the temp folder here, unlike in Vexflow, where it is current.
# it would be nice to have a tmp folder (for temporary files), but we'd want to delete the folder entirely, and we'd better not risk using rm -rf in a script

# All results are stored here.
RESULTS=$DIFF/results.txt
WARNINGS=$DIFF/warnings.txt

# If no prefix is provided, test all images.
if [ "$2" == "" ]
then
  files=*.png
else
  files=$2*.png
  echo "image filter (shell): $files"
fi

## Sanity checks: some simple checks that the script can run correctly (doesn't validate pngs)
folderWarningStringMsg="Exiting without running visual regression tests."
totalCurrentImages=`ls -1 $CURRENT/$files | wc -l | xargs` # xargs trims space
if [ $? -ne 0 ] || [ "$totalCurrentImages" -lt 1 ] # $? returns the exit code of the previous command (ls). (0 is success)
then
  echo Missing images in $CURRENT.
  echo Please run \"npm run generate:current\"
  exit 1
fi

totalBlessedImages=`ls -1 $BLESSED/$files | wc -l | xargs`
if [ $? -ne 0 ] || [ "$totalBlessedImages" -lt 1 ]
then
  echo Missing images in $BLESSED.
  echo Please run \"npm run generate:blessed\"
  exit 1
fi

# check that #currentImages == #blessedImages (will continue anyways)
if [ ! "$totalCurrentImages" -eq "$totalBlessedImages" ]
then
  echo "Warning: Number of current images ($totalCurrentImages) is not the same as blessed images ($totalBlessedImages). Continuing anyways."
else
  echo "Found $totalCurrentImages current and $totalBlessedImages blessed png files (not tested if valid). Continuing."
fi
# ----------------- end of sanity checks -----------------

mkdir -p $DIFF
if [ -e "$RESULTS" ]
then
  rm $DIFF/*
fi
touch $RESULTS
touch $RESULTS.fails
#   this shouldn't be named .fail because we have a *.fail shell match further below, which will loop endlessly if files are in the same folder (diff).
touch $WARNINGS

# Number of simultaneous jobs
nproc=$(sysctl -n hw.physicalcpu 2> /dev/null || nproc)
if [ -n "$NPROC" ]; then
  nproc=$NPROC
fi

total=`ls -l $BLESSED/$files | wc -l | sed 's/[[:space:]]//g'`

echo "Running $total tests with threshold $THRESHOLD (nproc=$nproc)..."

function ProgressBar {
    let _progress=(${1}*100/${2}*100)/100
    let _done=(${_progress}*4)/10
    let _left=40-$_done
    _fill=$(printf "%${_done}s")
    _empty=$(printf "%${_left}s")

    printf "\rProgress : [${_fill// /#}${_empty// /-}] ${_progress}%%"
}

function diff_image() {
  local image=$1
  local name=`basename $image .png`
  local blessed=$BLESSED/$name.png
  local current=$CURRENT/$name.png
  local diff=$DIFF/$name.png-temp

  if [ ! -e "$blessed" ]
  then
    echo " Warning: $name.png doesn't exist in $BLESSED. Skipped." >$diff.warn
    #((total--))
    return
  fi

  cp $blessed $diff-a.png
  cp $current $diff-b.png

  # Calculate the difference metric and store the composite diff image.
  local hash=`compare -metric PHASH -highlight-color '#ff000050' $diff-b.png $diff-a.png $diff-diff.png 2>&1`
  # convert hash to decimal if it was in scientific notation (e.g. 1.5e-2 -> 0.015)
  #   otherwise, syntax error will be returned for $hash > $THRESHOLD" | bc -l
  if [ ! $hash == 0 ] # don't change a "0" string
  then
    export LC_NUMERIC="en_US.UTF-8" # use dot instead of comma for decimals (1.5 instead of 1,5)
    hash=$(printf "%.14f" $hash) # precision seems limited to 15 digits in shell/awk(?)
    hash=$(echo $hash | bc -l | grep -o '.*[1-9]') # remove trailing 0s
    if (( $(echo "$hash < 1" |bc -l) ))
    then
      hash="0$hash" # add leading 0 (e.g. .01 -> 0.01), just for readability/display
    fi
  fi

  local isGT=`echo "$hash > $THRESHOLD" | bc -l`
  if [ "$isGT" == "1" ]
  then
    # Add the result to results.txt
    echo $name $hash >$diff.fail
    # Threshold exceeded, save the diff and the original, current
    cp $diff-diff.png $DIFF/$name.png
    cp $diff-a.png $DIFF/$name'_'Blessed.png
    cp $diff-b.png $DIFF/$name'_'Current.png
    echo
    echo "Test: $name"
    echo "  PHASH value exceeds threshold: $hash > $THRESHOLD"
    echo "  Image diff stored in $DIFF/$name.png"
    # $VIEWER "$diff-diff.png" "$diff-a.png" "$diff-b.png"
    # echo 'Hit return to process next image...'
    # read
  else
    echo $name $hash >$diff.pass
  fi
  rm -f $diff-a.png $diff-b.png $diff-diff.png
}

function wait_jobs () {
  local n=$1
  while [[ "$(jobs -r | wc -l)" -ge "$n" ]] ; do
     # echo ===================================== && jobs -lr
     # wait the oldest job.
     local pid_to_wait=`jobs -rp | head -1`
     # echo wait $pid_to_wait
     wait $pid_to_wait  &> /dev/null
  done
}

# check all blessed images are also in current
for image in $BLESSED/$files
do
  name=`basename $image .png`
  current=$CURRENT/$name.png
  if [ ! -e "$current" ]
  then
    $warnMsg=" Warning: $name.png missing in $CURRENT. Will be skipped."
    echo $warnMsg
    echo $warnMsg >$diff.warn
    #((total--))
  fi
done

count=0
for image in $CURRENT/$files
do
  count=$((count + 1))
  ProgressBar ${count} ${total}
  wait_jobs $nproc
  diff_image $image &
done
wait

cat $DIFF/*.warn 1>$WARNINGS 2>/dev/null
rm -f $DIFF/*.warn

## Check for files newly built that are not yet blessed.
for image in $CURRENT/$files
do
  name=`basename $image .png`
  blessed=$BLESSED/$name.png
  current=$CURRENT/$name.png
done

num_warnings=`cat $WARNINGS | wc -l`

cat $DIFF/*.fail 1>$RESULTS.fails 2>/dev/null
num_fails=`cat $RESULTS.fails | wc -l`
rm -f  $DIFF/*.fail

# Sort results by PHASH
sort -r -n -k 2 $RESULTS.fails >$RESULTS
sort -r -n -k 2 $DIFF/*.pass 1>>$RESULTS 2>/dev/null
rm -f $DIFF/*.pass $RESULTS.fails

echo
echo Results stored in $DIFF/results.txt
echo All images with a difference over threshold, $THRESHOLD, are
echo available in $DIFF, sorted by perceptual hash.
echo

if [ "$num_warnings" -gt 0 ]
then
  echo
  echo "You have $num_warnings warning(s):"
  cat $WARNINGS
fi

if [ "$num_fails" -gt 0 ]
then
  echo "You have $num_fails fail(s):"
  head -n $num_fails $RESULTS
else
  echo "Success - All diffs under threshold!"
fi
