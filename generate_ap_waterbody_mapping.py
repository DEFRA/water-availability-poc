#!/usr/bin/env python3
"""
Extract AP to waterbody mapping from CAMSAPs_NBB.xlsx spreadsheet.

Creates ap_waterbody_mapping.json with mappings from:
  EA_WB_ID (AP ID) -> Rivers_fRB (Waterbody ID)

Usage:
  python3 generate_ap_waterbody_mapping.py
"""

import openpyxl
import json

wb = openpyxl.load_workbook('CAMSAPs_NBB.xlsx', read_only=True)
sheet = wb.active

# Build mapping: EA_WB_ID -> Rivers_fRB (waterbody ID)
mapping = {}

for row in sheet.iter_rows(min_row=2, values_only=True):
    ea_wb_id = row[2]  # AP ID
    rivers_frb = row[36]  # Waterbody ID
    
    if ea_wb_id and rivers_frb:
        mapping[ea_wb_id] = rivers_frb

wb.close()

# Save to JSON
with open('ap_waterbody_mapping.json', 'w') as f:
    json.dump(mapping, f, indent=2)

print(f"Created mapping with {len(mapping)} entries")
print("\nFirst 5 entries:")
for i, (key, value) in enumerate(list(mapping.items())[:5]):
    print(f"  {key} -> {value}")
