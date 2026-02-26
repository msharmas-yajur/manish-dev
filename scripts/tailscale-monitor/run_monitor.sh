#!/bin/bash
# Wrapper script for cron execution
# Usage: Add to crontab: */5 * * * * /path/to/run_monitor.sh

set -e

# Change to script directory
cd "$(dirname "$0")"

# Load environment variables (skip comments and empty lines)
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

# Run the monitor
python3 tailscale_monitor.py
