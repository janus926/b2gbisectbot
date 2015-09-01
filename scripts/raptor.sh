#!/bin/bash

cd $BBB_B2GDIR && ./build.sh && ./flash.sh $3
if [ $? -ne 0 ]; then
  echo "Bisecting: skip"
  exit 125
fi

# Initial setup for the test.
if [ -z "$3" ]; then
  npm install @mozilla/raptor && \
  cd $BBB_B2GDIR/gaia && \
  make raptor && \
  until adb logcat -d -s PerformanceTiming | grep 'verticalhome.*fullyLoaded'; do sleep 1; done && \
  make reference-workload-light
fi

IFS=/ read app entry <<< $1

if [ -z "$entry" ]; then
  metrics=$($BBB_WORKDIR/../node_modules/.bin/raptor test coldlaunch --runs 30 --app $app)
else
  metrics=$($BBB_WORKDIR/../node_modules/.bin/raptor test coldlaunch --runs 30 --app $app --entry-point $entry)
fi
echo "$metrics"
mean=$(echo "$metrics" | grep visuallyLoaded | awk '{print $4}')

if [ $(echo "$mean < $2*0.95" | bc) -eq 1 ]; then
  echo "Bisecting: good"
  exit 0
fi
echo "Bisecting: bad"
exit 1
