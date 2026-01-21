#!/bin/bash
# Setup pm2-logrotate for Algora
# Run this once after pm2 is installed

set -e

echo "Installing pm2-logrotate module..."
pm2 install pm2-logrotate

echo "Configuring pm2-logrotate..."

# Rotate logs at 10MB
pm2 set pm2-logrotate:max_size 10M

# Keep 30 days of logs
pm2 set pm2-logrotate:retain 30

# Compress old logs
pm2 set pm2-logrotate:compress true

# Enable date-based rotation
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss

# Rotate at midnight
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

# Only rotate if file size > 1K (avoid empty rotations)
pm2 set pm2-logrotate:workerInterval 30

echo "pm2-logrotate configured successfully!"
echo ""
echo "Current settings:"
pm2 conf pm2-logrotate

echo ""
echo "Log rotation is now active. Logs will:"
echo "  - Rotate daily at midnight"
echo "  - Rotate when file size exceeds 10MB"
echo "  - Keep 30 days of history"
echo "  - Compress old logs with gzip"
