# CAMS Ledger Technical Report
## Water Availability, Hands-off Flow and HoF Bands

**Date**: 24 March 2026
**Based on**: CAMSLedger v4.8.2 (Cuckmere & Pevensey Levels) and v4.8.3 (Hampshire Avon)
**Status**: Both spreadsheets are structurally identical templates; this report applies to both.

---

## 1. Overview

The CAMS Ledger is a macro-enabled Excel workbook (.xlsm) used by the Environment Agency to assess water availability at Assessment Points (APs) within a CAMS area. Each ledger holds up to 20 APs and calculates resource availability under three scenarios: Recent Actual (RA), Future Predicted (FP), and Fully Licensed (FL).

The key outputs are:
- A colour classification (1–6) for each AP at four flow percentiles (Q30, Q50, Q70, Q95)
- HoF band assignments (MRF, HOF1–HOF6) indicating the flow threshold at which new licences would need cessation conditions
- Surplus/deficit of licensable water above the HoF threshold

The workbook contains 21 sheets. This report focuses on the sheets and mechanisms relevant to water availability classification, HoF determination, and HoF bands.

---

## 2. Spreadsheet Structure

### 2.1 Sheet Inventory

| Sheet | Role in WA/HoF |
|-------|----------------|
| Assessment Unit Details | AP identity, location, sensitivity band, and WRGIS export outputs |
| SWABS | Surface water abstraction licence inventory with HoF conditions per licence |
| GWABS | Groundwater abstraction inventory (similar structure to SWABS) |
| DIS | Discharge inventory |
| COMPLEX | Complex artificial influences |
| Flow Data | Natural flow statistics and override data per AP |
| River AP Relationships | Upstream/downstream AP network topology |
| Ups Impacts | Accumulated upstream artificial influence summaries per AP |
| FDC Calcs | Core calculation engine — natural FDCs, EFI/HoF bands, scenario FDCs |
| Scen Results | Scenario flow outputs (pasted by macro), colour classification, HoF outputs |
| LDMU Impacts | Large Downstream Management Unit impacts (optional) |
| Lake or Res Impacts | Lake/reservoir impacts (optional) |

### 2.2 Data Flow Summary

```
Licence data (SWABS/GWABS/DIS/COMPLEX)
    ↓ monthly profiles & HOF conditions
Ups Impacts (accumulates per AP)
    ↓ interpolated to FDC percentiles
FDC Calcs (natural FDC + impacts → scenario FDC)
    ↓ macro pastes results as values
Scen Results (RA/FP/FL scenario flows)
    ↓ compared against EFI thresholds
Colour Classification (1-6) + HoF Band + Surplus/Deficit
    ↓ exported to
Assessment Unit Details (WRGIS upload columns)
```

---

## 3. Water Availability Classification

### 3.1 Colour Classification Formula

The classification is calculated in `Scen Results` rows 429–432 (one row per percentile: Q30, Q50, Q70, Q95). Each AP gets a column. The logic compares RA scenario flows against EFI thresholds and FL scenario flows against natural flows:

```
IF natural_flow = 0 → "Nat 0"
IF RA_scenario_flow ≥ EFI:
    IF FL_scenario_flow > 1.1 × natural_flow → 1 (Blue: water available)
    IF FL_scenario_flow ≥ EFI                → 2 (Green: restricted water available)
    IF FL_scenario_flow ≥ 0.9 × EFI         → 3 (Yellow: limited water available)
    ELSE                                     → 4 (Red: over-licensed)
IF RA_scenario_flow ≥ EFI − 0.25 × natural  → 5 (Orange: over-abstracted)
ELSE                                         → 6 (Dark Red: seriously over-abstracted)
```

The inputs to this formula are:
- `FDC Calcs` natural flow at the relevant percentile (e.g. row 138 = Q30 natural for AP1)
- `FDC Calcs` EFI flow at the relevant percentile (e.g. row 295 = EFI at Q30)
- `Scen Results` RA scenario flow (e.g. row 34 = RA at Q30)
- `Scen Results` FL scenario flow (e.g. row 312 = FL at Q30)

### 3.2 EFI (Environmentally-acceptable Flow Indicator)

The EFI is the minimum flow that must remain in the river after all abstraction. It is calculated in `FDC Calcs` rows 264–366 as a modified FDC that steps down from the natural flow through a series of bands (MRF → HOF1 → HOF2 → ... → HOF6), each allowing a defined "take" before the next band threshold applies.

The EFI FDC is not a simple percentage of natural flow — it is a piecewise function that progressively reduces the available flow through the HoF band structure (see Section 4).

### 3.3 Scenario Flows

Scenario flows are the natural FDC modified by accumulated artificial influences (abstractions and discharges). The calculation happens live in `FDC Calcs` rows 896+ and is then pasted as values into `Scen Results` by the VBA Update Macro:

- Rows 5–105: RA (Recent Actual) scenario
- Rows 144–244: FP (Future Predicted) scenario
- Rows 283–383: FL (Fully Licensed) scenario

### 3.4 Assessment Unit Details and WRGIS

The `Assessment Unit Details` sheet has two distinct zones:

**Columns B–R (Display Zone)**: Formula-driven cells that reference the data zone. These provide a human-readable view for the hydrologist. Examples:
- `C9 = IF(V9="","",V9)` — mirrors the Water Body ID from column V
- `J9 = IF(I9="","",INT(I9))` — the "for CAMSLedger" ASB, which can be overridden from the WRGIS value

**Columns U–BI (WRGIS Data Zone)**: All plain values — no formulas. This is the data store that is both populated by and exported to WRGIS. The column headers in row 8 use WRGIS table.field naming (e.g. `CAMSAPs.EA_WB_ID`, `ScenarioFlows.ScenRAQ30`, `CAMSColours.CAMSclrQ95`).

The WRGIS data zone columns map to three WRGIS database tables:

| Columns | WRGIS Table | Content |
|---------|-------------|---------|
| U–AC (+ AZ–BI) | CAMSAPs | AP identity, location, sensitivity, downstream topology, critical AP, HoF text, models |
| AD–AH | CAMS_AP table | WFD status (HMWB, ecological, biology, chemistry, fish) |
| AI–AM | CAMSAPs | Natural flow statistics (QN30/50/70/95) and data source |
| AN–AU | ScenarioFlows | RA and FL scenario flows at Q30/50/70/95 |
| AV–AY | CAMSColours | Colour classifications at Q30/50/70/95 |

Row 30 onwards contains a separate GW body data section (also WRGIS values).

**Inbound (WRGIS → Ledger) — confirmed**: VBA Module10 (`WRGISExport2018_ApplyFormatWorkSheet`) is designed to be called externally — its `Public Sub` signature accepts row counts as parameters and it suppresses the Excel UI. Comments in the code state it was *"written to be run from ArcGIS Python WRGIS Export tool"* (Neil Thurston, Wood, April 2018), though we have not inspected the Python side and cannot independently verify this. The code structure is consistent with external invocation: it expects pre-populated temporary sheets (`CAMStmp`, `GWQUANTtmp`, etc.) and a path to a previous ledger file.

What the macro does:

1. Copies formulas down in SWABS/GWABS/DIS to cover all data rows
2. Sorts and pastes data from temporary sheets as values into `Assessment Unit Details` columns V–BI (row 9 onwards)
3. Copies previous ledger data (QA details, expert judgement fields) from an older ledger version via `CopyLedgerData`
4. Calls `VBA_Update_Sheets_Code2` twice (the scenario update macro) to recalculate all scenarios and ensure colours are correct
5. Formats AP tables and chart titles

**Outbound (Ledger → WRGIS) — inferred, not confirmed**: The mechanism for reading results back into WRGIS is not contained in the spreadsheet, but several signals suggest it is intended:

- The filename convention `_FORUPLOAD` explicitly suggests the spreadsheet is prepared for upload
- The WRGIS field names in row 8 (`ScenarioFlows.ScenRAQ30`, `CAMSColours.CAMSclrQ95`) map to what look like specific database table.column references — you wouldn't name columns that way unless something was reading them back positionally
- The scenario flows and colours are stored as plain values (not formulas) in a contiguous block — convenient for an external tool to read
- Row 5 has a separate set of human-readable headers above the same columns — this dual-header structure (row 5 for humans, row 8 for WRGIS field mapping) suggests a structured import/export contract
- Module10 is literally called `WRGISExport2018` — the word "export" implies data going out, not just in

Taken together, it is reasonable to infer that the same external Python tool (or a companion process) reads the calculated values back from columns U–BI after the macro has run. But the outbound mechanism is not in the spreadsheet.

The text fields `Liccrit` (col BD) and `HOFAvail` (col BE) are free-text summaries entered by the hydrologist — they are not calculated.

---

## 4. Hands-off Flow (HoF) Bands

### 4.1 What HoF Bands Represent

HoF bands divide the flow range between the Minimum Residual Flow (MRF) and the natural Q30 flow into six bands (HOF1–HOF6). Each band defines a flow threshold below which certain licences must cease abstraction. New licence applications are assigned a HoF band based on where the current FL scenario flow crosses the EFI curve.

### 4.2 EFI Table

The EFI Table is a named range (`EFITable` = `FDC Calcs!W213:AC218`) that defines how the natural flow is partitioned into bands based on the Abstraction Sensitivity Band (ASB) of the AP:

| ASB | Low Flow Take | INT1 | INT2 | INT3 | INT4 | K factor |
|-----|--------------|------|------|------|------|----------|
| 3 (Low) | 10% of QN95 | 20% | 40% | 60% | 30% | — |
| 2 (Moderate) | 15% of QN95 | 20% | 40% | 60% | 40% | — |
| 1 (High) | 20% of QN95 | 20% | 40% | 60% | 50% | — |

The percentiles that define the band boundaries are: 95, 85, 75, 65, 50, 35, 15 (row 219).

The K factor (column AC) determines the proportion of each interval that is licensable as a "take" within that band.

### 4.3 HoF Band Calculation

Calculated in `FDC Calcs` rows 210–249. For each AP:

1. **MRF** (row 212): A fixed proportion of the Q95 natural flow, derived from the EFI table percentile for the AP's sensitivity band.

2. **HOF1** (row 221/227): Equal to the natural Q95 flow. This is the first threshold — below this, only the MRF and low-flow take apply.

3. **HOF2–HOF6** (rows 230–242): Each successive band adds an interval (INT1–INT5) to the previous band's threshold. The intervals are derived from the natural FDC by looking up flows at the percentile boundaries defined in the EFI table:
   - INT1 = natural flow at 85th percentile − natural flow at 95th percentile
   - INT2 = natural flow at 75th − natural flow at 85th
   - INT3 = natural flow at 65th − natural flow at 75th
   - INT4 = natural flow at 50th − natural flow at 65th
   - INT5 = natural flow at 35th − natural flow at 50th
   - INT6 = natural flow at 15th − natural flow at 35th

4. **TAKEs** (rows 244–249): The licensable abstraction within each band. TAKE = interval width × K factor from the EFI table.

Example values for AP1 (Cowbeech, ASB=2):

| Band | Threshold (Ml/d) | Take (Ml/d) |
|------|------------------|-------------|
| MRF | 0.91 | — |
| HOF1 | 1.73 | 0.31 |
| HOF2 | 2.51 | 0.35 |
| HOF3 | 3.37 | 0.52 |
| HOF4 | 4.67 | 1.24 |
| HOF5 | 7.78 | 2.37 |
| HOF6 | 13.69 | 9.26 |

### 4.4 EFI FDC Construction

The EFI FDC (`FDC Calcs` rows 266–366) is a 101-point flow duration curve representing the minimum acceptable flow at each percentile. It is constructed by progressively subtracting the low-flow take and each band's take from the natural flow, capping at each HoF threshold:

```
Starting from natural flow at percentile P:
  Subtract low-flow take → cap at MRF
  Subtract TAKE1 → cap at HOF1
  Subtract TAKE2 → cap at HOF2
  ... and so on through TAKE6
  Beyond HOF6, remaining flow reduces proportionally
```

This creates a stepped curve that sits below the natural FDC, defining the environmental flow requirement at every percentile.

---

## 5. HoF Assignment for New Licences

### 5.1 Per-Licence HoF Conditions (SWABS)

Each surface water abstraction line in the SWABS sheet carries:

- **Hands-off Flow Condition** (col AM, Ml/d): The actual HoF value on the licence, sourced from NALD
- **HoF Waterbody ID** (col AN): Which AP the HoF condition relates to
- **HoF AP Number** (col AQ): Resolved AP number for the HoF condition
- **Non-AP HoF percentile switch-off** (cols AJ–AL): The flow percentile at which this licence's abstraction ceases, for each scenario (RA/FP/FL). A value of 98 means the licence stops abstracting when flows drop below the 98th percentile exceedance. A value of 0 means no HoF restriction.

### 5.2 HoF Percentile Switch-off Mechanism

The non-AP HoF percentile is the mechanism by which existing licence HoF conditions are translated into the FDC impact calculation. For each licence line in SWABS:

1. A monthly abstraction profile (cols AX–BI) determines which months the licence is active
2. The consumptive impact (cols BN–BY) is calculated as: `monthly_flag × abstraction_rate × (100 − %_returned) / 100`
3. The scenario selector (RA/FP/FL) determines which abstraction rate is used
4. These monthly impacts are converted to a flow-ranked profile using the monthly flow ranking from `Flow Data`

The HoF percentile columns (AJ–AL) control at which point on the FDC the licence's impact drops to zero. Licences with HoF conditions only impact flows above their HoF threshold.

### 5.3 AP-Level HoF Band Assignment

The critical HoF band for each AP is determined in `Scen Results` row 422. The formula finds where the FL scenario flow crosses the EFI curve and assigns the corresponding band:

```
IF this is the critical AP:
  IF FL flow at crossing > HOF6 threshold → ">HOF6"
  IF FL flow crosses between HOF5 and HOF6 → "HOF6"
  IF FL flow crosses between HOF4 and HOF5 → "HOF5"
  ... and so on ...
  IF FL flow is below HOF1 → "MRF"
ELSE → "not crit"
```

The "critical AP" is the downstream AP with the worst (lowest percentile) crossing point — i.e. the AP where the FL scenario flow first drops below the EFI.

### 5.4 Remaining Take Above HoF

`Scen Results` row 426 calculates the remaining licensable water above the assigned HoF band. This is the difference between the FL scenario flow and the EFI at the crossing percentile — effectively how much more abstraction could be licensed before the next HoF band would be triggered.

---

## 6. VBA Macros

### 6.1 Update Macro (ThisWorkbook — 38K chars)

The primary macro `VBA_Update_Sheets_Code1` (Ctrl+G) performs the scenario calculation cycle. It does not contain any calculation logic itself — it orchestrates Excel's formula engine:

1. Copies formulas down in SWABS, GWABS, DIS, and FDC Calcs to ensure all rows are populated
2. Sets the scenario selector (`FDC Calcs!W2`) to each scenario in turn (RA → FP → FL, or user-selected order)
3. Triggers `Application.Calculate` after each scenario change
4. Copies the resulting scenario FDC from `FDC Calcs` rows 896–1029 and pastes as values into the corresponding block in `Scen Results`
5. Optionally copies LDMU and Lake/Reservoir impacts
6. Timestamps the run in `Scen Results` row 2

All actual water availability and HoF calculations are performed by Excel formulas, not VBA.

### 6.2 Other Modules

| Module | Purpose |
|--------|---------|
| Module6 (UpdatePlusApp) | "Add, Test & Remove" — temporarily adds a new application to test its impact |
| Module4 (RollBack) | Removes test application data after Module6 |
| Module5 (ClearTest) | Clears test application results |
| Module2 (ImportAp) | Imports AP data from external sources |
| Module10 (WRGISExport) | Formats data for WRGIS upload (53K chars — the largest module) |
| Module8 (IsFormula) | Single utility function |
| Module7 | Chart toggle for AP FDC plots |
| Module16 | Non-ASCII character checker |

### 6.3 VBA Impact on Calculations

The VBA macros do not perform any water availability or HoF calculations. They are purely operational — copying formulas, switching scenarios, pasting values, and formatting exports. All calculation logic resides in the Excel formula engine. The cached values (read with `data_only=True` in openpyxl) are therefore reliable representations of the last macro run.

---

## 7. Key Named Ranges

| Name | Reference | Purpose |
|------|-----------|---------|
| EFITable | `FDC Calcs!W213:AC218` | Sensitivity band parameters for HoF band calculation |
| Scen | `FDC Calcs!W2` | Current scenario selector (RA/FP/FL) |
| Nat | `FDC Calcs!A109:U209` | Natural FDC per AP |
| RA | `Scen Results!A5:U105` | Recent Actual scenario flows |
| FP | `Scen Results!A144:U244` | Future Predicted scenario flows |
| FL | `Scen Results!A283:U383` | Fully Licensed scenario flows |
| uncondenat | `FDC Calcs!A581:U681` | Unconstrained denaturalised FDC |
| UpstreamAPs | `River AP Relationships!D8:W28` | AP network topology |

---

## 8. Denaturalisation Pipeline

The scenario FDC construction in `FDC Calcs` follows a multi-step denaturalisation process:

1. **Natural FDC** (rows 109–209): Interpolated or overridden natural flow duration curve
2. **EFI/HoF Bands** (rows 210–249): MRF, HOF1–6, and TAKEs calculated from natural FDC + EFI table
3. **EFI FDC** (rows 266–366): Environmental flow requirement curve
4. **Upstream impacts interpolated** (rows 371–471): GW, unconstrained SW, discharge, and complex impacts from `Ups Impacts`, interpolated to FDC percentiles
5. **Step 1b** (rows 476–576): Natural + all non-HoF impacts combined
6. **Step 1c** (rows 581–681): Re-percentiled to ensure monotonic FDC
7. **Step 2a** (rows 685–785): HoF-constrained SWABS impacts interpolated separately
8. **Step 2b** (rows 790–890): Denaturalised Step 1 + HoF SWABS impacts combined
9. **Step 2c** (rows 896–1029): Final re-percentiling → this is the scenario FDC that gets pasted into `Scen Results`

The separation of HoF-constrained SWABS (Step 2a) from unconstrained impacts (Step 1) is critical — it ensures that licences with HoF conditions only reduce flows above their HoF threshold, while unconstrained abstractions affect the entire FDC.

---

## 9. Expert Judgement Fields

Several inputs in the ledger require hydrologist judgement rather than automated derivation:

- Monthly abstraction profiles (SWABS cols AX–BI)
- Percentage of water returned (SWABS col AG)
- Impact point location vs licence point (SWABS cols L–O)
- Downstream AP assignment (SWABS col AO)
- Growth factors for FP scenario (SWABS col AH)
- GW spatial distribution across APs
- Lowest flow impact factor
- Abstraction Sensitivity Band selection (can be overridden from WRGIS value)

These fields represent the primary barrier to full automation of the ledger process.

---

## 10. Data Currency

| Item | Cuckmere & Pevensey | Hampshire Avon |
|------|-------------------|----------------|
| Ledger version | v4.8.2 | v4.8.3 |
| Licence data refresh | Dec 2020 | Dec 2022 |
| Last scenario run | May 2025 | May 2025 |
| Naturalisation period | 1990–2020 | — |
| Owner | Bethan McNeil | — |
