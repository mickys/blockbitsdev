#! /bin/bash

time truffle test > output/test.log && aha --black -f output/test.log > output/test.html