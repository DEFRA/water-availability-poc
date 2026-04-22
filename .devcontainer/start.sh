#!/bin/bash
# Start Docker Compose and wait for PostGIS before starting the app
docker compose up -d

echo "Waiting for PostGIS..."
for i in $(seq 1 30); do
  if pg_isready -h 127.0.0.1 -U postgres -d water_availability 2>/dev/null; then
    echo "PostGIS is ready"
    exec npm run dev
  fi
  sleep 2
done

echo "PostGIS failed to start after 60 seconds"
exit 1
