# RAM Ledger and ALS Document Analysis - Findings Summary

## Overview

Analysis of the Cuckmere & Pevensey Levels RAM (Resource Assessment and Management) Ledger and corresponding ALS (Abstraction Licensing Strategy) document to extract assessment point and HOF (Hands Off Flow) data.

## Key Findings

### 1. Data Sources Comparison

| Data Element | RAM Ledger | ALS PDF | EA Hydrology API | NRFA |
|--------------|------------|---------|------------------|------|
| Assessment Point Names | ✅ | ✅ | ✅ | ✅ |
| Coordinates (Easting/Northing) | ✅ | ❌ | ✅ | ✅ |
| WISKI IDs | ✅ | ❌ | ✅ | ❌ |
| NRFA Station IDs | ❌ | ❌ | ✅ | ✅ |
| Q30/Q50/Q70/Q95 Statistics | ✅ | ❌ | ❌ | ✅ |
| HOF Values | ✅ | ✅ | ❌ | ❌ |
| Catchment Areas | ✅ | ❌ | ✅ | ✅ |
| Historic Flow Data | ❌ | ❌ | ✅ | ✅ |
| Licensing Policy | ❌ | ✅ | ❌ | ❌ |

### 2. ID System Clarification

**RAM Ledger "Gauging Station Reference" is actually WISKI ID, not NRFA number**

Example for Cowbeech:
- **RAM Ledger**: Lists `351550005` as "Gauging Station Reference"
- **Reality**: `351550005` is the WISKI ID (EA internal system)
- **NRFA Station ID**: `41016` (found via EA Hydrology API)
- **EA Station GUID**: `2231adf7-22c8-4290-af00-a97b688a4574`

### 3. Assessment Points Extracted

Successfully extracted 6 river assessment points from Cuckmere & Pevensey Levels:

1. **Cowbeech - River Cuckmere** (AP1)
2. **Lealands - River Cuckmere** (AP2)
3. **Sherman Bridge - River Cuckmere** (AP3)
4. **Boreham Bridge - Upper Wallers Haven** (AP4)
5. **Crowhurst - Combe Haven** (AP5)
6. **Rickney - Pevensey Haven** (AP6)

### 4. Data Availability by Source

#### RAM Ledger (Excel .xlsm)
**Strengths:**
- Complete technical data for calculations
- Precise coordinates (British National Grid)
- Flow statistics (Q30, Q50, Q70, Q95)
- HOF values and remaining capacity
- Catchment areas
- Abstraction sensitivity bands
- WISKI IDs

**Limitations:**
- No historic flow data
- No licensing policy context
- Mislabels WISKI IDs as "Gauging Station Reference"

#### ALS Document (PDF)
**Strengths:**
- Licensing policy and approach
- HOF restrictions and availability
- Days per annum water available
- Environmental context
- Downstream restrictions

**Limitations:**
- No precise coordinates
- No flow statistics
- No station IDs
- Narrative format (not structured data)

#### EA Hydrology API
**Strengths:**
- Real-time and historic flow data
- Multiple temporal resolutions (15min, daily)
- Station metadata (coordinates, catchment area)
- Links to NRFA stations
- Active status monitoring

**Limitations:**
- No HOF data
- No licensing information
- No Q statistics

#### NRFA (National River Flow Archive)
**Strengths:**
- Long-term historic flow records
- Flow statistics
- Station metadata
- Quality-controlled data

**Limitations:**
- Not all EA stations included
- No HOF data
- No licensing information

## Linking Assessment Points Across Systems

### Example: Cowbeech - River Cuckmere

| System | Identifier | Value |
|--------|-----------|-------|
| RAM Ledger | CAMS AP Number | 1 |
| RAM Ledger | Water Body ID | AP1, Cowbeech - River Cuckmere |
| RAM Ledger | "Gauging Station" | 351550005 (WISKI ID) |
| RAM Ledger | Coordinates | E: 561138.625, N: 115070.359375 |
| EA Hydrology API | Station GUID | 2231adf7-22c8-4290-af00-a97b688a4574 |
| EA Hydrology API | WISKI ID | 351550005 |
| EA Hydrology API | Label | Cowbeech |
| EA Hydrology API | Coordinates | E: 561135, N: 115076 |
| NRFA | Station ID | 41016 |
| NRFA | URL | https://nrfa.ceh.ac.uk/data/station/info/41016.html |

**Linking Strategy:**
1. Use WISKI ID (351550005) to find station in EA Hydrology API
2. EA Hydrology API provides NRFA Station ID (41016)
3. Use coordinates as fallback if IDs don't match

## Historic Flow Data Retrieval

### EA Hydrology API Endpoints

**Daily Mean Flow:**
```
https://environment.data.gov.uk/hydrology/data/readings.json?measure={station-guid}-flow-m-86400-m3s-qualified&startdate=2020-01-01&enddate=2020-12-31
```

**Example for Cowbeech:**
```
https://environment.data.gov.uk/hydrology/data/readings.json?measure=2231adf7-22c8-4290-af00-a97b688a4574-flow-m-86400-m3s-qualified
```

**Available Measures:**
- Daily mean flow (m3/s)
- Daily max flow (m3/s)
- Daily min flow (m3/s)
- 15-minute instantaneous flow (m3/s)

**Data Coverage:**
- Cowbeech: From 1939-04-01 (station opened)
- Data available from 1990-09-25 in API

## Automated Extraction

### Script Created: `extract_ram_ledger.py`

**Purpose:** Extract assessment point and HOF data from any RAM Ledger file

**Usage:**
```bash
python extract_ram_ledger.py "path/to/ledger.xlsm" --output output.json --pretty
```

**Extracts:**
- Metadata (CAMS name, owner, review dates)
- Assessment point details (location, catchment area, sensitivity)
- Flow statistics (Q30, Q50, Q70, Q95)
- HOF data (HOF number, value, remaining capacity)
- WISKI IDs (labeled as "Gauging Station")

## Recommendations

### For GIS/Mapping Applications
1. **Primary Source**: RAM Ledger for coordinates and technical data
2. **Flow Data**: EA Hydrology API for historic/real-time flows
3. **Linking**: Use WISKI ID to connect RAM Ledger → EA API → NRFA

### For Licensing Applications
1. **Primary Source**: ALS PDF for policy and restrictions
2. **Technical Data**: RAM Ledger for calculations
3. **Validation**: EA Hydrology API for current flow conditions

### For Data Integration
1. Extract structured data from RAM Ledger using `extract_ram_ledger.py`
2. Enrich with NRFA Station IDs from EA Hydrology API
3. Link to historic flow data via NRFA or EA API
4. Cross-reference with ALS for licensing context

## Data Quality Notes

1. **Coordinate Precision**: RAM Ledger coordinates are more precise than EA API (sub-meter vs ~5m)
2. **Catchment Area**: Small differences between sources (RAM: 19.11 km², EA: 18.7 km²)
3. **ID Confusion**: RAM Ledger mislabels WISKI IDs as "Gauging Station Reference"
4. **Missing Links**: Not all RAM Ledger stations have NRFA equivalents
5. **AP6 (Rickney)**: No gauging station - modeled data only

## Files Generated

1. **cuckmere_pevensey_assessment_points.md** - Detailed summary of all 6 assessment points
2. **extract_ram_ledger.py** - Python script for automated extraction from RAM Ledgers

## Next Steps

1. Apply extraction script to other RAM Ledgers
2. Build database linking WISKI IDs to NRFA Station IDs
3. Create automated flow data retrieval pipeline
4. Integrate HOF data with real-time flow monitoring
5. Develop GIS layer showing assessment points with live status
