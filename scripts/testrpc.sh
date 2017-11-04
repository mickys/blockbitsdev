#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

if [ "$SOLIDITY_COVERAGE" = true ]; then
  testrpc_port=8555
else
  testrpc_port=8545
fi

testrpc_running() {
  nc -z localhost "$testrpc_port"
}

start_testrpc() {
  if [ "$SOLIDITY_COVERAGE" = true ]; then
    node_modules/.bin/testrpc-sc -a 25 --gasLimit 0xfffffffffff --port "$testrpc_port"  > /dev/null &
#    node_modules/.bin/testrpc --gasLimit 0xfffffffffff --port "$testrpc_port"  > /dev/null &
  else
    node_modules/.bin/testrpc -a 25 -i 15 > /dev/null &
  fi

  # testrpc_pid=$!
  # echo $testrpc_pid > testrpc.pid
}

if testrpc_running; then
    # kill -9 $( lsof -i -P | grep $testrpc_port | awk '{print $2}' )
    echo "not killing anything";
fi

echo "Starting our own testrpc instance at port $testrpc_port"
start_testrpc
