#!/bin/bash
set -e

echo "Installing dependencies..."
npm install

echo "Installing postgresql-client..."
sudo apt-get update && sudo apt-get install -y postgresql-client > /dev/null 2>&1

echo "Starting PostGIS (fresh)..."
docker compose down -v
docker compose up -d

echo "Waiting for PostGIS to be ready..."
until pg_isready -h 127.0.0.1 -U postgres -d water_availability 2>/dev/null; do
  echo "  PostGIS not ready, retrying..."
  sleep 2
done

echo "Ensuring schema is up to date..."
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d water_availability \
  -c "ALTER TABLE waterbody_features ALTER COLUMN geometry_type TYPE VARCHAR(100);" 2>/dev/null || true

echo "Downloading England.geojson..."
curl -L --retry 3 --retry-delay 5 -o england_waterbodies.geojson \
  "https://environment.data.gov.uk/catchment-planning/England.geojson"

echo "Loading waterbody features..."
node load_waterbodies.js

echo "Loading water availability polygons..."
node load_wa_polygons.js

echo "Setup complete!"
