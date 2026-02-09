#!/bin/bash

# Windows path (WSL format)
WINDOWS_PATH="/mnt/c/Users/ooxmi/Downloads/Ver.007【コード】INTERCONNECT"

# Create directory if it doesn't exist
mkdir -p "$WINDOWS_PATH"

# Sync files excluding node_modules and .git
rsync -av --delete \
  --exclude 'node_modules/' \
  --exclude '.git/' \
  --exclude '.env' \
  --exclude 'netlify/functions/node_modules/' \
  /home/ooxmichaelxoo/INTERCONNECT_project/ \
  "$WINDOWS_PATH/"

echo "Sync completed to: $WINDOWS_PATH"
echo "Synced at: $(date)"