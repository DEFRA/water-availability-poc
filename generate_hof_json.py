#!/usr/bin/env python3
"""
Generate hof_values.json from RAM ledger files.
Extracts AP data and matches to EA Hydrology stations.
"""
import json
import requests
import sys
from pathlib import Path
from extract_ram_ledger import extract_ram_ledger

def find_station_guid(ap_name, cams_area, easting, northing):
    """Find EA Hydrology station GUID for an AP by searching and coordinate matching."""
    # Try searching by AP name - use the location part after the dash
    search_term = ap_name.split(' - ')[-1] if ' - ' in ap_name else ap_name
    search_term = search_term.replace('AP', '').replace(',', '').strip()
    
    # Remove leading numbers
    parts = search_term.split()
    if parts and parts[0].isdigit():
        search_term = ' '.join(parts[1:])
    
    try:
        url = f"https://environment.data.gov.uk/hydrology/id/stations?search={search_term}"
        response = requests.get(url)
        data = response.json()
        
        if data.get('items'):
            # Find station with flow data
            best_match = None
            best_distance = None
            min_distance = 500  # 500m threshold
            
            for station in data['items']:
                # Check if station has flow data
                has_flow = any(m.get('parameter') == 'flow' for m in station.get('measures', []))
                if not has_flow:
                    continue
                
                # If we have coordinates, check distance
                if easting and northing and station.get('easting') and station.get('northing'):
                    distance = ((station['easting'] - easting) ** 2 + 
                               (station['northing'] - northing) ** 2) ** 0.5
                    
                    if distance < min_distance:
                        min_distance = distance
                        best_match = station
                        best_distance = round(distance, 1)
                elif not best_match:
                    # No coordinates to match, use first station with flow
                    best_match = station
                    best_distance = None
            
            if best_match:
                return {
                    'station_guid': best_match['notation'],
                    'rloi_id': best_match.get('RLOIid'),
                    'distance_m': best_distance
                }
    
    except Exception as e:
        print(f"  Error searching for {ap_name}: {e}")
    
    return None

def generate_hof_json(ledger_files, output_file='hof_values.json'):
    """Generate hof_values.json from RAM ledger files."""
    hof_values = {}
    
    for ledger_path in ledger_files:
        print(f"\nProcessing {ledger_path}...")
        
        # Extract data from RAM ledger
        data = extract_ram_ledger(ledger_path)
        cams_area = data['metadata']['cams_name']
        
        print(f"CAMS Area: {cams_area}")
        print(f"Found {len(data['assessment_points'])} assessment points")
        
        # Process each AP with HoF data
        for ap in data['assessment_points']:
            if not ap.get('hof_data') or not ap['hof_data'].get('hof_value_ml_per_day'):
                continue
            
            ap_id = ap['water_body_id']
            composite_key = f"{cams_area}|{ap_id}"
            
            print(f"\n  Processing {ap_id}...")
            
            # Find matching station GUID
            station_info = find_station_guid(
                ap['water_body_id'],
                cams_area,
                ap.get('location', {}).get('easting') if ap.get('location') else None,
                ap.get('location', {}).get('northing') if ap.get('location') else None
            )
            
            if station_info:
                print(f"    Found station: {station_info['station_guid']}")
                if station_info.get('rloi_id'):
                    print(f"      RLOI ID: {station_info['rloi_id']}")
                if station_info.get('distance_m') is not None:
                    print(f"      Distance: {station_info['distance_m']}m")
            else:
                print(f"    No station found")
            
            # Build HoF entry
            hof_values[composite_key] = {
                'ap_number': ap['cams_ap_number'],
                'ap_name': ap['water_body_id'],
                'hof_value': ap['hof_data']['hof_value_ml_per_day'],
                'hof_number': ap['hof_data'].get('hof_number', 'unknown'),
                'cams_area': cams_area
            }
            
            if station_info:
                hof_values[composite_key]['station_guid'] = station_info['station_guid']
                if station_info.get('rloi_id'):
                    hof_values[composite_key]['rloi_id'] = station_info['rloi_id']
                if station_info.get('distance_m') is not None:
                    hof_values[composite_key]['distance_m'] = station_info['distance_m']
    
    # Save to file
    with open(output_file, 'w') as f:
        json.dump(hof_values, f, indent=2)
    
    print(f"\n✓ Generated {output_file} with {len(hof_values)} entries")
    
    # Summary
    with_stations = sum(1 for v in hof_values.values() if 'station_guid' in v)
    print(f"  {with_stations} APs matched to hydrology stations")
    print(f"  {len(hof_values) - with_stations} APs without station match")

if __name__ == '__main__':
    ledger_files = [
        'Hampshire Avon_CAMSLedgerv4.8.3_31032025_FORUPLOAD.xlsm',
        'Cuckmere & Pevensey Levels_CAMSLedgerv4.8.2_14122020_1556_APR25ReadyforUpload_FORUPLOAD.xlsm'
    ]
    
    # Check files exist
    missing = [f for f in ledger_files if not Path(f).exists()]
    if missing:
        print(f"Error: Missing files: {', '.join(missing)}")
        sys.exit(1)
    
    generate_hof_json(ledger_files)
