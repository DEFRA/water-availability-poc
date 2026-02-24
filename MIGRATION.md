# Migration to Postgres/PostGIS

This document outlines the plan to migrate from external EA API calls to a local Postgres/PostGIS database for improved performance and reliability.

## Current Performance Issues

- **Water availability WFS**: 500ms-17s (highly variable)
- **Waterbody API**: 600ms-56s per waterbody (highly variable, cannot handle parallel requests)
- **Total load time**: 2-60+ seconds depending on EA service performance

## Migration Plan

### Phase 1: Setup Postgres/PostGIS
1. Create docker-compose.yml for PostGIS container
2. Create database schema with spatial tables
3. Start Docker container
4. Add Node.js Postgres client and test connection

### Phase 2: Migrate Waterbody Features (Biggest Win)
- Download England.geojson (8,701 waterbody features) from https://environment.data.gov.uk/catchment-planning/England.geojson
- Load into `waterbody_features` table with spatial index
- Update `/waterbody/{id}` endpoint to query Postgres instead of EA API
- Keep timing logs to verify performance improvement
- **Expected improvement**: 600ms-56s → 10-50ms per waterbody

### Phase 3: Migrate Water Availability Polygons
- Fetch all water availability polygons from WFS (one-time bulk fetch)
- Load into `water_availability_polygons` table with spatial index
- Update `/nearby-catchments` to use PostGIS spatial query (ST_DWithin)
- **Expected improvement**: 500ms-17s → 10-50ms

### Phase 4: Migrate Abstraction Licences (Optional)
- Load ~4000 abstraction licence points into database
- Add spatial filtering in Postgres for viewport queries
- **Expected improvement**: Faster viewport filtering

### Phase 5: Data Refresh Strategy
- Create refresh script to re-download and update data
- Schedule: Weekly for abstraction licences, monthly for other data
- Water availability and waterbody data are strategic planning data (updated annually)

## Services to Keep as External APIs

- **Operational catchments** (ArcGIS): Fast and reliable (200-450ms), no need to cache
- **WMS tile layers**: Keep using EA's WMS for visual display (fast)
- **Postcode geocoding**: postcodes.io is fast and reliable

## Expected Overall Performance

- **Current**: 2-60+ seconds (variable)
- **After migration**: 200-500ms (consistent)
