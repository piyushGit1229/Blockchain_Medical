#!/bin/bash
cd /home/piyush/medical
nohup node server/bench/benchmark.js > /tmp/med-bench.log 2>&1 &
echo "benchmark started pid $!"
