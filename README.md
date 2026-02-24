# Water Availability Mapping Proof of Concept

A web application that displays water availability data and related hydrological information for UK locations based on postcode input.

## Features

- **Postcode Search**: Enter a UK postcode to center the map and display relevant data
- **Water Availability Layer**: Interactive WMS tiles showing water availability status with clickable polygons
- **Monitoring Sites**: Water monitoring site locations as clickable markers (with priority rendering above other layers)
- **Abstraction Licences**: Abstraction licence point locations across England with licence details
- **Waterbody Features**: Displays catchment areas and river lines within 1km of the postcode with labels
- **Geological Layer**: BGS Hydrogeology data (optional overlay)
- **Interactive Popups**: Click on polygons and markers to view detailed information
- **Results List**: Detailed list view showing catchments with waterbody names and related features
- **Distance Calculation**: Accurate distance calculation (0km if inside catchment, distance to boundary if outside)

## Architecture

### Database
- **PostgreSQL with PostGIS**: Local database for all spatial data
- **Docker Compose**: Easy setup with `docker-compose up -d`
- **Data**: 
  - 8,701 waterbody features (3,928 RiverLine + 1,001 Catchment polygons)
  - 4,436 water availability polygons
- **Performance**: 2-55ms queries vs 600ms-56s EA API calls

### Data Strategy
- **Water Availability Polygons**: Stored in Postgres, queried with PostGIS spatial functions
- **Catchment Boundaries**: Use WA polygons (same geometry)
- **RiverLine Features**: Fetch from local Postgres database
- **Waterbody Names**: Fetch from local Postgres database
- **Result**: Eliminated all slow/unreliable EA API dependencies

## Data Sources

### Water Availability Data (Local Database)
- **Source**: EA WFS service (loaded once, transformed from EPSG:27700 to EPSG:4326)
- **Storage**: PostgreSQL with PostGIS
- **Content**: 4,436 water availability polygons with classification data
- **Query Time**: 10-50ms (vs 500ms-5.5s from WFS)
- **Display**: WMS tiles from Environment Agency service (visual only)
- **Interaction**: WMS GetFeatureInfo for polygon clicks
- **Properties**: Includes `camscdsq95` (color classification) and `ea_wb_id` (waterbody identifier)
- **Usage**: WA polygons serve as catchment boundaries

### Waterbody Features (Local Database)
- **Source**: England.geojson from EA Catchment Planning API (loaded once)
- **Storage**: PostgreSQL with PostGIS
- **Content**: RiverLine features and waterbody names
- **Query Time**: 2-55ms (vs 600ms-56s from EA API)
- **Endpoint**: `/waterbody/{id}` returns RiverLine features only

### Geological Data
- **Source**: British Geological Survey (BGS)
- **Service**: `https://map.bgs.ac.uk/arcgis/services/GeoIndex_Onshore/hydrogeology/MapServer/WmsServer`
- **Layer**: Hydrogeology data
- **Format**: WMS tiles

### Monitoring Sites
- **Source**: Environment Agency Hydrology API and CAMS Assessment Points
- **Service**: `https://environment.data.gov.uk/hydrology/id/stations`
- **CAMS APs**: `https://environment.data.gov.uk/geoservices/datasets/.../ea_catchment_abstraction_management_strategy_assessment_points`
- **Content**: Hydrological monitoring stations including river flows, levels, groundwater, rainfall, and water quality
- **Enrichment**: APs enriched with waterbody IDs from CAMSAPs_NBB.xlsx spreadsheet mapping
- **Format**: JSON transformed to GeoJSON
- **Display**: Orange circle markers with popup data, rendered above other layers
- **Note**: Waterbody mapping uses EA_WB_ID (AP identifier) as unique key. CAMS ledger names are inconsistent between API and spreadsheet sources, so only EA_WB_ID is used for reliable mapping.

### Abstraction Licences
- **Source**: Environment Agency ArcGIS REST Service
- **Service**: `https://services1.arcgis.com/JZM7qJpmv7vJ0Hzx/ArcGIS/rest/services/Help_for_licence_trading_Abstraction_licence_points/FeatureServer`
- **Description**: Water trading map licences January 2025
- **Content**: Abstraction licence point locations with licence details (purpose, source type, catchment, category)
- **Format**: ArcGIS JSON transformed to GeoJSON with pagination (1000 record limit per request)
- **Display**: Blue circle markers with popup data, rendered above other layers

### Waterbody Features
- **Source**: Environment Agency Catchment Planning API
- **Service**: `https://environment.data.gov.uk/catchment-planning/WaterBody/{ea_wb_id}.geojson`
- **Content**: Catchment boundaries, river lines, and other waterbody features
- **Format**: GeoJSON

### Postcode Geocoding
- **Source**: Postcodes.io
- **Service**: `https://api.postcodes.io/postcodes/{postcode}`
- **Content**: Converts UK postcodes to WGS84 coordinates

## Technical Implementation

- **Backend**: Node.js with Hapi.js framework using proxy routes with mapUri for efficient service integration
- **Frontend**: Leaflet.js for mapping, Turf.js for spatial operations (union, distance calculations)
- **Coordinate Systems**: WGS84 (EPSG:4326) throughout with proper OGC service configuration
- **Performance**: WMS tiles for display, WFS for spatial queries, viewport-based filtering
- **Architecture**: Modular service URLs defined as constants for maintainability

## Service Integration

- **WMS (Web Map Service)**: Fast tile rendering and GetFeatureInfo queries
- **ArcGIS REST**: Monitoring sites and abstraction licence data
- **PostGIS**: Spatial queries for all local data
- **OGC Standards**: Proper coordinate system handling across all services

## Usage

1. Start the database: `docker-compose up -d`
2. Load data (one-time setup):
   - `node load_waterbodies.js` - Load 8,701 waterbody features
   - `node load_wa_polygons.js` - Load 4,436 water availability polygons
3. Start the server: `npm start`
4. Navigate to `http://localhost:3000`
5. Enter a UK postcode
6. View the map with water availability data
7. Toggle layers on/off using the control panel
8. Click on polygons and markers for detailed information
9. Use "View Catchments" to see detailed list with waterbody information

## API Endpoints

- `GET /` - Postcode input page
- `POST /postcode` - Geocode postcode to coordinates
- `GET /map` - Interactive map view
- `GET /results` - Catchment results list view
- `GET /water-availability-info` - WMS GetFeatureInfo for polygon clicks (proxied with mapUri)
- `GET /nearby-catchments` - Spatial query for WA polygons within radius (from Postgres)
- `GET /water-availability-polygons` - WA polygons in viewport bbox (from Postgres)
- `GET /monitoring-sites` - Monitoring sites GeoJSON data
- `GET /abstraction-licences` - Abstraction licence points GeoJSON data with pagination
- `GET /waterbody/{id}` - RiverLine features for specific waterbody ID (from Postgres)
- `GET /waterbody-names` - Waterbody names by IDs (from Postgres)
- `GET /water-availability-wms` - Proxy for EA water availability WMS service
- `GET /hydrology-wms` - Proxy for BGS geological WMS service

## Development

### Codespaces
- Use `./startup-codespace.sh` to create and configure a GitHub Codespace
- Automatically sets up port forwarding and opens the application
- Includes devcontainer configuration for consistent development environment

### CAMS Assessment Points Caching
- In development mode (NODE_ENV !== 'production'), CAMS APs are cached to `cams_aps_cache.json`
- Cache expires after 24 hours
- Significantly speeds up server startup (avoids fetching 1097 APs from API)
- Cache file is gitignored and works in both local dev and Codespaces
- To regenerate AP waterbody mapping: `python3 generate_ap_waterbody_mapping.py`

### Code Standards
- Backend follows neostandard coding standards
- Service URLs centralized as constants for maintainability
- Proxy routes use Hapi.js mapUri for efficient parameter transformation

---

## CORS and Proxy Routes

The application uses server-side proxy routes for some external services to avoid CORS issues.

**Current Architecture**:
- Most data served from local Postgres database (no CORS issues)
- WMS tile layers and GetFeatureInfo proxied through server
- Monitoring sites and abstraction licences fetched from ArcGIS REST APIs

---

## Performance Characteristics

The application includes timing instrumentation to monitor performance bottlenecks.

### Current Performance (Results Page Load)

**Typical load time: <1 second**
- nearby-catchments (WFS, cached): 500ms-5.5s (first hit), instant (cached)
- waterbody-names (Postgres): 5-20ms
- waterbody RiverLine features (Postgres): 2-55ms per waterbody
**Typical load time: <1 second**
- nearby-catchments (Postgres): 10-50ms
- waterbody-names (Postgres): 5-20ms
- waterbody RiverLine features (Postgres): 2-55ms per waterbody
- abstraction licences (parallel, after render): 300ms each

### Performance Improvements

**Before migration:**
- Total load time: 2-60+ seconds (highly variable)
- EA Catchment Planning API: 600ms-56s per waterbody (unreliable)
- EA WFS Service: 500ms-5.5s (variable)
- Frequent 503 errors and timeouts

**After migration:**
- Total load time: <1 second (consistent)
- Postgres queries: 2-55ms (reliable)
- Eliminated all slow/unreliable EA API dependencies

### Remaining External Dependencies

**ArcGIS Services** (abstraction licences) are consistently fast:
- Response times: 200-450ms
- Reliable performance

### Monitoring

Timing logs are available in:
- **Browser console**: `[CLIENT TIMING]` messages show end-to-end request times
- **Server console**: `[TIMING]` messages show server-side processing and external API response times

These logs help identify when external EA services are experiencing performance issues.
