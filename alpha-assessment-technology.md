# Technology Selection — GDS Alpha Assessment

Service Standard points 11 (Choose the right tools and technology) and 13 (Use and contribute to open standards, common components and patterns).

## Infrastructure options and why

The service will run on the **Defra Core Delivery Platform (CDP)** — a multi-tenant platform for microservice-based systems where the underlying AWS cloud hosting is abstracted away from users, allowing teams to concentrate on adding business value through their applications rather than recreating infrastructure. CDP uses fully managed AWS services where possible, balanced against user needs and technology maturity.

This is the standard hosting choice for Defra digital services and provides:
- Managed container orchestration for the application
- Managed PostgreSQL (RDS) with PostGIS extension for spatial data
- CI/CD pipelines integrated with GitHub
- Consistent environments from development through to production
- Security, monitoring, and logging as platform concerns

The PoC validated key technology choices:
- **Node.js with Hapi.js** — Defra's standard backend framework, well-suited to the proxy and API aggregation patterns this service requires
- **PostgreSQL with PostGIS** — for spatial data storage and queries. The PoC demonstrated this reduces query times from 600ms–56s (calling EA APIs directly) to 2–55ms, eliminating reliability issues with external services
- **WMS/WFS integration** — OGC open standards for consuming EA and BGS geospatial services

## Who is the user base?

Primary users are **prospective water abstraction licence applicants** — farmers, landowners, water companies, and their agents — who need to understand whether water is available at a specific location before investing time and money in a licence application.

Secondary users may include EA licensing officers and water resources staff who currently rely on regional spreadsheets (CAMS Ledgers) to answer the same questions.

## Is the service transactional or non-transactional?

**Non-transactional.** It is an information service — users query water availability data by location. There is no account creation, form submission, or payment. It could become part of a transactional journey if integrated with the licence application process in future.

## What environments will there be?

Standard CDP pipeline:
- **Development** — for active development and integration
- **Test** — for QA and acceptance testing
- **Pre-production** — production-like environment for final validation
- **Production** — live service

CI/CD via GitHub Actions deploying through CDP's managed pipeline.

## What common patterns and technology are envisaged?

- **GOV.UK Design System** — for frontend patterns and accessibility compliance
- **GOV.UK Frontend toolkit** — standard GDS/Defra components
- **Hapi.js** — Defra's standard Node.js framework
- **PostgreSQL with PostGIS** — OGC-standard spatial database
- **WMS/WFS** — OGC open standards for geospatial data integration
- **Postcodes.io** — open source geocoding
- **Server-side rendering** with progressive enhancement (see below)
- **Microservice architecture** — aligned with CDP's design principles

## Technical risks and mitigations

### Risk 1: EA geospatial APIs too slow/unreliable for production use

**Experiment:** The PoC tested direct EA WFS and Catchment Planning API calls against a local PostGIS database loaded with the same data.

**Result:** PostGIS reduced response times from 2–60 seconds (highly variable, with frequent 503 errors) to under 1 second (consistent). This validated the approach of loading EA spatial data into a local database rather than depending on external APIs at request time.

### Risk 2: HOF and water availability data not available in structured form outside CAMS Ledger spreadsheets

**Experiment:** Reverse-engineered the CAMS Ledger spreadsheet (Cuckmere & Pevensey Levels) to understand the full calculation chain — 21 sheets covering FDC construction, EFI framework, licence impact accumulation, and colour classification. Investigated the NALD database for licence and HOF condition data.

**Result:** The calculation logic is fully traceable and implementable in code. NALD holds ~60–70% of the required licence data (quantities, periods, points, HOF conditions). However, critical inputs — monthly abstraction profiles, percentage of water returned, and groundwater spatial impact distributions — are expert judgement stored only in the spreadsheets. Approximations using conservative defaults are feasible for screening purposes but not for formal licensing decisions.

### Risk 3: Naturalised flow data needed for HOF calculations is not readily accessible

**Experiment:** Analysed the CAMS Ledger's Flow Data sheet to understand the source and nature of the natural flow statistics used in calculations.

**Result:** Naturalised FDCs are produced by hydrological modelling (CatchMod, decomposition methods, Low Flows Enterprise) — not available from operational APIs or databases. They also drift over time as the gauged record extends. Published ledger outputs could be used as a baseline, with the understanding that values become stale between periodic CAMS reviews.

### Risk 4: Water availability classifications may be stale between CAMS reviews

**Experiment:** Explored whether incremental updates are possible by detecting new licences granted since the last ledger date using NALD data.

**Result:** New licences can be identified and their basic parameters retrieved from NALD. Incremental impact estimates are possible with conservative defaults for the missing expert inputs. This would be sufficient for flagging APs where availability may have changed — useful for screening, not for replacing the formal CAMS review process.

## Data publishing

The water availability geospatial data would be published via the **Defra Data Services Platform**. The Defra GIS team have confirmed there is a formal approval-for-access process to follow but do not foresee any issues with this. There may also be a case for publishing to ArcGIS Online but this is to be confirmed.

## Client-side JavaScript and progressive enhancement

The PoC currently uses client-side JavaScript for the map interface (Leaflet.js). For beta, the approach will be progressive enhancement:

- **Without JavaScript:** The core user needs — are licences available, what HOF applies, and when would abstraction have been restricted — will be answerable through server-rendered HTML pages with text and tables. The postcode search, results list, and seasonal restriction data do not require a map.
- **With JavaScript:** The interactive map provides additional spatial context as an enhancement — viewing catchment boundaries, clicking polygons for details, toggling layers. This adds value but is not required to answer the core questions.

This ensures the service is usable for all users regardless of device capability or assistive technology, with the map as a progressive enhancement for those who can use it.
