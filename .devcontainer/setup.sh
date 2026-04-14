#!/bin/bash
set -e

echo "Installing dependencies..."
npm install

echo "Waiting for PostGIS to be ready..."
until PGPASSWORD=postgres pg_isready -h "${DB_HOST:-localhost}" -U postgres -d water_availability 2>/dev/null; do
  echo "  PostGIS not ready, retrying..."
  sleep 2
done

echo "Loading waterbody features..."
node load_waterbodies.js

echo "Loading water availability polygons..."
node load_wa_polygons.js

echo "Setup complete!"
