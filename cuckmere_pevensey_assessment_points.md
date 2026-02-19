# Cuckmere & Pevensey Levels - Assessment Points and HOF Data

## Source Files
- **RAM Ledger**: `Cuckmere & Pevensey Levels_CAMSLedgerv4.8.2_14122020_1556_APR25ReadyforUpload_FORUPLOAD.xlsm`
- **ALS Document**: `Cuckmere_Pevensey_Abstraction_Licensing_Stategy.pdf`
- **Extraction Script**: `extract_ram_ledger.py` (for automated extraction from RAM Ledgers)
- **Naturalisation Period**: 1990-2020
- **Owner**: Bethan McNeil
- **Sign-off**: Paul Batty
- **Reviewer**: Tony Byrne
- **Last Review Date**: 2025-04-03

## Automated Extraction

This data was extracted using the `extract_ram_ledger.py` script, which can be applied to any RAM Ledger file:

```bash
# Extract to JSON
python extract_ram_ledger.py "path/to/ledger.xlsm" --output output.json --pretty

# Extract to stdout
python extract_ram_ledger.py "path/to/ledger.xlsm"
```

The script extracts:
- Metadata (CAMS name, owner, review dates)
- Assessment point details (location, catchment area, sensitivity)
- Flow statistics (Q30, Q50, Q70, Q95)
- HOF data (HOF number, value, remaining capacity)
- NRFA station references

## Assessment Points Summary

### 1. Cowbeech - River Cuckmere
- **CAMS AP Number**: 1
- **Water Body ID**: AP1, Cowbeech - River Cuckmere
- **NRFA Station**: 351550005
- **Location**: 
  - Easting: 561138.625
  - Northing: 115070.359375
- **Catchment Area**: 19.11 km²
- **Abstraction Sensitivity Band**: 2 (Moderate)
- **Downstream AP**: 3 (Sherman Bridge)

**Flow Statistics (Ml/d)**:
- Q30: 16.56
- Q50: 7.74
- Q70: 4.07
- Q95: 1.48

**HOF Data**:
- HOF Number: not crit (Not critical - no HOF restriction)
- HOF Value: 19.91 Ml/d
- Remaining TAKE above HOF: 19.64 Ml/d

---

### 2. Lealands - River Cuckmere
- **CAMS AP Number**: 2
- **Water Body ID**: AP2, Lealands - River Cuckmere
- **NRFA Station**: 351540001
- **Location**:
  - Easting: 557606.9375
  - Northing: 113055.7890625
- **Catchment Area**: 40.59 km²
- **Abstraction Sensitivity Band**: 2 (Moderate)
- **Downstream AP**: 3 (Sherman Bridge)

**Flow Statistics (Ml/d)**:
- Q30: 30.20
- Q50: 12.01
- Q70: 5.46
- Q95: 2.00

**HOF Data**:
- HOF Number: not crit (Not critical - no HOF restriction)
- HOF Value: 36.05 Ml/d
- Remaining TAKE above HOF: 38.30 Ml/d

---

### 3. Sherman Bridge - River Cuckmere
- **CAMS AP Number**: 3
- **Water Body ID**: AP3, Sherman Bridge - River Cuckmere
- **NRFA Station**: 351520004
- **Location**:
  - Easting: 553290.5
  - Northing: 105209.8671875
- **Catchment Area**: 126.01 km²
- **Abstraction Sensitivity Band**: 2 (Moderate)
- **Downstream AP**: None (Terminal point)

**Flow Statistics (Ml/d)**:
- Q30: 94.07
- Q50: 36.68
- Q70: 16.65
- Q95: 5.68

**HOF Data**:
- HOF Number: HOF6
- HOF Value: 69.11 Ml/d
- Remaining TAKE above HOF: 75.08 Ml/d

---

### 4. Boreham Bridge - Upper Wallers Haven
- **CAMS AP Number**: 4
- **Water Body ID**: AP4, Boreham Bridge - Upper Wallers Haven
- **NRFA Station**: 351220016
- **Location**:
  - Easting: 567620.375
  - Northing: 112010.7421875
- **Catchment Area**: 59.40 km²
- **Abstraction Sensitivity Band**: 2 (Moderate)
- **Downstream AP**: None (Terminal point)

**Flow Statistics (Ml/d)**:
- Q30: 47.44
- Q50: 22.70
- Q70: 13.09
- Q95: 6.62

**HOF Data**:
- HOF Number: MRF (Minimum Residual Flow)
- HOF Value: 4.35 Ml/d
- Remaining TAKE above HOF: 0.12 Ml/d (Very limited availability)

---

### 5. Crowhurst - Combe Haven
- **CAMS AP Number**: 5
- **Water Body ID**: AP5, Crowhurst - Combe Haven
- **NRFA Station**: 351110006
- **Location**:
  - Easting: 576480.875
  - Northing: 110240.359375
- **Catchment Area**: 36.03 km²
- **Abstraction Sensitivity Band**: 2 (Moderate)
- **Downstream AP**: None (Terminal point)

**Flow Statistics (Ml/d)**:
- Q30: 21.76
- Q50: 10.27
- Q70: 5.50
- Q95: 2.25

**HOF Data**:
- HOF Number: HOF3
- HOF Value: 6.10 Ml/d
- Remaining TAKE above HOF: 0.39 Ml/d (Very limited availability)

---

### 6. Rickney - Pevensey Haven
- **CAMS AP Number**: 6
- **Water Body ID**: AP6, Rickney - Pevensey Haven
- **NRFA Station**: No gauging station
- **Location**:
  - Easting: 565909
  - Northing: 104411.0625
- **Catchment Area**: 99.42 km²
- **Abstraction Sensitivity Band**: 1 (High)
- **Downstream AP**: None (Terminal point)

**Flow Statistics (Ml/d)**:
- Q30: 64.37
- Q50: 37.15
- Q70: 22.55
- Q95: 12.01

**HOF Data**:
- HOF Number: MRF (Minimum Residual Flow)
- HOF Value: 11.02 Ml/d
- Remaining TAKE above HOF: 9.89 Ml/d

---

## Key Definitions

### HOF (Hands Off Flow)
Minimum flow threshold below which new abstraction licences cannot operate. Protects environmental flows during low-flow conditions.

### MRF (Minimum Residual Flow)
The absolute minimum flow that must remain in the watercourse after abstraction.

### NRFA Station Numbers
National River Flow Archive station reference numbers used to identify gauging stations.

### Flow Statistics (Q values)
- **Q30**: Flow exceeded 30% of the time (higher flows, ~110 days/year below this)
- **Q50**: Flow exceeded 50% of the time (median flow, ~183 days/year below this)
- **Q70**: Flow exceeded 70% of the time (lower flows, ~256 days/year below this)
- **Q95**: Flow exceeded 95% of the time (very low flows, ~18 days/year below this)

### Abstraction Sensitivity Bands
- **Band 1**: High sensitivity - most restrictive
- **Band 2**: Moderate sensitivity
- **Band 3**: Low sensitivity - least restrictive

### Remaining TAKE above HOF
The amount of water (Ml/d) that can still be abstracted above the HOF threshold before reaching full allocation.

## Water Availability Summary

### Good Availability
- **Cowbeech** (AP1): Not critical, 19.64 Ml/d remaining
- **Lealands** (AP2): Not critical, 38.30 Ml/d remaining
- **Sherman Bridge** (AP3): HOF6 applies, 75.08 Ml/d remaining
- **Rickney** (AP6): MRF applies, 9.89 Ml/d remaining

### Limited Availability
- **Boreham Bridge** (AP4): MRF applies, only 0.12 Ml/d remaining
- **Crowhurst** (AP5): HOF3 applies, only 0.39 Ml/d remaining

## NRFA Station Reference Numbers

| AP | Name | NRFA Station |
|----|------|--------------|
| 1 | Cowbeech - River Cuckmere | 351550005 |
| 2 | Lealands - River Cuckmere | 351540001 |
| 3 | Sherman Bridge - River Cuckmere | 351520004 |
| 4 | Boreham Bridge - Upper Wallers Haven | 351220016 |
| 5 | Crowhurst - Combe Haven | 351110006 |
| 6 | Rickney - Pevensey Haven | No station |

## Notes

1. **Coordinates**: All coordinates are in British National Grid (EPSG:27700)
2. **Units**: All flows in Megalitres per day (Ml/d)
3. **Data Source**: Naturalisation by Catchmod 1990-2007 for most APs
4. **Critical Points**: AP4 and AP5 have very limited remaining abstraction capacity
5. **High Sensitivity**: AP6 (Rickney) is the only assessment point with Band 1 (High) sensitivity
6. **Station IDs**: NRFA (National River Flow Archive) station numbers are provided where available
7. **No WISKI/RLOI IDs**: The RAM Ledger does not contain WISKI or RLOI identifiers
