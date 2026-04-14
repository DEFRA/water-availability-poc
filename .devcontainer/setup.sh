#!/bin/bash
set -e

echo "Installing dependencies..."
npm install

echo "Installing postgresql-client..."
sudo apt-get update && sudo apt-get install -y postgresql-client

echo "Starting PostGIS..."
docker compose up -d

echo "Waiting for PostGIS to be ready..."
until pg_isready -h localhost -U postgres -d water_availability 2>/dev/null; do
  echo "  PostGIS not ready, retrying..."
  sleep 2
done

echo "Loading waterbody features..."
node load_waterbodies.js

echo "Loading water availability polygons..."
node load_wa_polygons.js

echo "Setup complete!"
