#!/usr/bin/env bash
set -e
echo "========================================================"
echo "  JTS-Meet: Starting Standalone SFU Media Server Cluster"
echo "========================================================"
docker compose -f docker-compose.sfu.yml up -d
echo "LiveKit SFU running at ws://localhost:7880"
echo "Redis running at localhost:6379"
