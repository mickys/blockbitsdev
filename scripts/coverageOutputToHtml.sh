#! /bin/bash

./scripts/coverage.sh > output/coverage.log && aha --black -f output/coverage.log > output/coverage.html