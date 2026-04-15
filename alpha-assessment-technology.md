# Service Assessment Proforma — Technology (Alpha)

Water Availability Mapping Service

*Abbreviations used throughout this document are defined in the [Glossary](#glossary) at the end.*

---

## Supporting Evidence (Alpha)

- Completed Data Protection Impact Assessment: TBC
- Solution Architecture: See infrastructure and technology sections below
- Test Approach: See "Operate a reliable service" section below

---

## Create a secure service which protects users' privacy

Service Standard point 9.

### What security threats does the service perceive and what mitigations?

The service is an information-only service with no user accounts or personal data collection. The data served is limited to publicly available water resource availability classifications and environmental flow information — it does not include commercially sensitive abstraction licence details, individual abstraction volumes, or licence holder information. The primary threats are:

- **Denial of service** — Mitigated by CDP's platform-level protections (WAF, rate limiting)
- **Abuse of proxy routes** — The service proxies requests to EA and BGS WMS/WFS services. Mitigated by validating and constraining query parameters server-side
- **Web scraping / data harvesting** — Defra services have previously been targeted for geospatial data scraping. Mitigated by CDP's WAF rate limiting, viewport-scoped queries (no bulk download endpoints), and application-level request throttling. The underlying data is publicly available via EA data services; the Defra Data Services Platform is the appropriate channel for bulk access.
- **Dependency vulnerabilities** — Mitigated by automated dependency scanning (Dependabot/SonarCloud) and regular updates
- **TLS certificate validation** — The PoC disables TLS verification (`NODE_TLS_REJECT_UNAUTHORIZED = '0'`) for development convenience. This will be removed for production.

### Will the service be processing personal data?

No. The service does not collect, store, or process personal data. Users enter a UK postcode to query water availability — postcodes are not personal data. No accounts, cookies (beyond essential session cookies), or tracking are used.

### Does the service perceive any data protection issues?

No. All data is publicly available environmental data sourced from EA and BGS geospatial services. The service is hosted within the UK on Defra's CDP (AWS UK regions). No data is shared with third parties. Location lookup will use the Ordnance Survey Places API, which Defra has an existing licence for.

### Has the service engaged the local data protection team?

TBC — DPIA screening to be completed prior to beta.

### What is the plan for maintaining the security of the system and system dependencies?

- Automated dependency updates via Dependabot
- Static code analysis via SonarCloud
- CDP platform-level security patching and monitoring
- Regular review of external service integrations

### Is the service adhering to Secure by Design?

Yes. The service follows Secure by Design principles:
- Minimal attack surface — no user accounts, no data collection, no authentication required
- Server-side proxy routes prevent direct client access to external APIs
- Input validation on postcode and coordinate parameters
- CDP provides infrastructure-level security controls

### Is the service adhering to Data Protection by Design and by Default?

The service collects no personal data by design.

### Is the service to be assured via GovAssure?

TBC — to be confirmed with the security team prior to beta.

---

## Technology Selection

Service Standard points 11 (Choose the right tools and technology) and 13 (Use and contribute to open standards, common components and patterns).

## Infrastructure options and why

The service will run on the **Defra Core Delivery Platform (CDP)** — a multi-tenant platform for microservice-based systems where the underlying AWS cloud hosting is abstracted away from users, allowing teams to concentrate on adding business value through their applications rather than recreating infrastructure. CDP uses fully managed AWS services where possible, balanced against user needs and technology maturity.

This is the standard hosting choice for Defra digital services and provides:
- Managed container orchestration for the application
- Managed PostgreSQL (RDS) with PostGIS extension for spatial data
- CI/CD pipelines integrated with GitHub
- Consistent environments from development through to production
- Security, monitoring, and logging as platform concerns

### Proposed beta architecture

The PoC is a single monolithic application. The beta architecture will be split into three services aligned with CDP's microservice patterns:

- **Frontend service** — GOV.UK Design System compliant, server-side rendered, responsible for user-facing pages and progressive enhancement (map)
- **Backend API service** — serves spatial queries and water availability data from RDS/PostgreSQL with PostGIS
- **Data aggregation service** — fetches and transforms data from external sources (EA, BGS, OS) and persists it to the database on a predetermined schedule or trigger. This service will only persist data locally where the SLAs of the source API are not sufficient to meet our service SLAs — where external APIs are reliable and performant enough, the backend will call them directly

Persistence will use managed RDS PostgreSQL with PostGIS where needed. The PoC validated that local persistence of spatial data significantly improves performance and reliability compared to calling external APIs at request time.

### External service integrations

The beta service will integrate with the following APIs:

- **OS Places API** — geocoding for postcode, grid reference, and easting/northing lookup
- **Defra Data Services Platform** — geospatial querying and map rendering via open standards (WMS/WFS)
- **RPA land parcel APIs** (TBC) — may be required to geocode land parcels for location-based queries

### Proof of Concept

A PoC was built during alpha to test and validate technical assumptions before committing to the beta architecture. It is a single Node.js/Hapi.js application with a PostGIS database, deployed via GitHub Codespaces for rapid iteration. The PoC tested:

- Spatial query performance (PostGIS vs external EA APIs)
- Integration with EA WMS/WFS, BGS, and hydrology services
- Postcode-to-catchment lookup and water availability classification display
- Feasibility of extracting HOF and licence data from CAMS Ledger spreadsheets and NALD
- Map-based and list-based presentation of water availability data

The PoC is not representative of the proposed beta architecture but validated the key technology choices and identified the technical risks documented below.

### Technology choices validated by the PoC

- **Node.js with Hapi.js** — Defra's standard backend framework, well-suited to the API and data aggregation patterns this service requires
- **PostgreSQL with PostGIS** — for spatial data storage and queries. The PoC demonstrated this reduces query times from 600ms–56s (calling EA APIs directly) to 2–55ms, eliminating reliability issues with external services
- **WMS/WFS integration** — OGC open standards for consuming EA and BGS geospatial services

## Who is the user base?

Primary users are **prospective water abstraction licence applicants** — farmers, landowners, water companies, and their agents — who need to understand whether water is available at a specific location before investing time and money in a licence application.

Secondary users may include EA licensing officers and water resources staff who currently rely on regional spreadsheets (CAMS Ledgers) to answer the same questions.

Further work may be needed to determine whether there is an identified need for API consumers, for example in the water industry. If so, this may be met by publishing data via the Defra Data Services Platform rather than building a separate API.

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
- **Ordnance Survey Places API** — for postcode, grid reference, and easting/northing lookup. Defra has an existing licence. The PoC used Postcodes.io for convenience; beta will use the OS API for broader location search capabilities.
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

Some data originates from the **Water Resources GIS (WR GIS)**, which has a formal publishing approval process to determine whether geospatial data can be made public, taking into account licensing and commercial sensitivity considerations. This approval process will need to be completed for any WR GIS-sourced data before it can be served through the public-facing service.

## Client-side JavaScript and progressive enhancement

The PoC currently uses client-side JavaScript for the map interface (Leaflet.js). For beta, the approach will be progressive enhancement:

- **Without JavaScript:** The core user needs — are licences available, what HOF applies, and when would abstraction have been restricted — will be answerable through server-rendered HTML pages with text and tables. The postcode search, results list, and seasonal restriction data do not require a map.
- **With JavaScript:** The interactive map provides additional spatial context as an enhancement — viewing catchment boundaries, clicking polygons for details, toggling layers. This adds value but is not required to answer the core questions.

This ensures the service is usable for all users regardless of device capability or assistive technology, with the map as a progressive enhancement for those who can use it.

---

## Make source code open

Service Standard point 12.

### When and where will the code be published?

Code will be published on **Defra's GitHub organisation** (https://github.com/DEFRA) from the start of beta development.
The alpha PoC code is at (https://github.com/DEFRA/water-availability-poc).

### Where will the code be statically analysed?

**SonarCloud**, integrated into the CI/CD pipeline via GitHub Actions. Analysis will run on every pull request and merge to main.

### Will Defra own the code?

Yes. All code is developed by the Defra delivery team and will be owned by Defra, published under an open source licence (MIT or OGL) in line with GDS standards.

---

## Operate a reliable service

Service Standard point 14.

### How do you intend to make your service resilient and reliable?

- **CDP platform** provides managed infrastructure with built-in redundancy, auto-scaling, and health monitoring
- **Local database** (PostGIS) for spatial queries eliminates dependency on external EA APIs at request time — the PoC demonstrated this reduces response variability from 2–60s to consistently under 1s
- **External service failures** are handled gracefully — WMS tile layers and monitoring site data degrade without breaking the core service
- **Data refresh** strategy: water availability data is strategic planning data updated infrequently. A scheduled refresh process will reload data from EA sources, with the existing data remaining available during refresh

### What is the test approach?

- **Functional testing** — automated tests covering API endpoints, spatial queries, and data transformation logic
- **Accessibility testing** — against WCAG 2.2 AA, using automated tools (axe) and manual testing with assistive technologies
- **Performance testing** — validated during alpha via PoC timing instrumentation (client and server-side timing logs)
- **Cross-browser testing** — against GDS stipulated browsers
- **Exploratory testing** — manual testing of map interactions, edge cases (invalid postcodes, locations outside England, boundary conditions)

### How will the service ensure quality?

- Development will follow the **Defra Software Development Standards**
- neostandard coding standards enforced via ESLint
- Definition of Done includes code review, test coverage and SonarCloud quality gate pass
- Acceptance criteria defined per user story
- Agile delivery with regular show-and-tells and user feedback

### How does the service intend to test against GDS stipulated browsers?

Cross-browser testing will be performed against the current GDS browser list. The progressive enhancement approach (core functionality in server-rendered HTML, map as JavaScript enhancement) ensures the service works across all supported browsers including those without JavaScript. The beta service will use the **Defra Interactive Map component** (https://github.com/DEFRA/interactive-map) — a recently released accessible map component designed to meet Defra's accessibility and cross-browser requirements. The PoC used Leaflet.js for simplicity.

### Will you appoint a Tester?

Yes

### What environments have been decided upon and how do you intend to implement continuous integration?

- Standard CDP environments: development, test, pre-production, production.
- CI/CD via GitHub Actions with automated build, test, static analysis (SonarCloud), and deployment through CDP's managed pipeline.
- Every merge to main triggers the pipeline; deployments to production require approval.

---

## Glossary

| Abbreviation | Definition |
|---|---|
| BGS | British Geological Survey |
| CAMS | Catchment Abstraction Management Strategy |
| CDP | Core Delivery Platform (Defra's managed hosting platform) |
| CI/CD | Continuous Integration / Continuous Deployment |
| DPIA | Data Protection Impact Assessment |
| EA | Environment Agency |
| EFI | Environmental Flow Indicator |
| FDC | Flow Duration Curve |
| GDS | Government Digital Service |
| GIS | Geographic Information System |
| HOF | Hands Off Flow |
| NALD | National Abstraction Licensing Database |
| OGC | Open Geospatial Consortium |
| OGL | Open Government Licence |
| OS | Ordnance Survey |
| RDS | Relational Database Service (AWS managed PostgreSQL) |
| RPA | Rural Payments Agency |
| TLS | Transport Layer Security |
| WAF | Web Application Firewall |
| WCAG | Web Content Accessibility Guidelines |
| WFS | Web Feature Service (OGC standard) |
| WMS | Web Map Service (OGC standard) |
| WR GIS | Water Resources Geographic Information System |
