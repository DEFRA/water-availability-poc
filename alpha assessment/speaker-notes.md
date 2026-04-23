# Alpha Assessment — Technology Slides Speaker Notes

## Slide 1: Technical proposals and rationale

Welcome back. I'm Neil McLaughlin, lead developer on the team. I joined in December, part way through alpha, brought in with a brief to keep the design grounded in technical reality — making sure what we're proposing is feasible and buildable. I'm going to walk through the technical landscape, the proposed architecture for beta, and how we're meeting the service standard on technology, open source, security, and reliability. As Keir covered the data requirements before lunch, I'll build on that context.

Before I start, this being the section where we talk about tech, there are a lot
of acronyms so I've posted a glossary of those used to the chat.

The most commonly occurring is GIS (Geographic Information System) - this refers to systems used for storing and querying data linked to geographic locations — for example, finding which water availability areas are near a given postcode as well as rendering maps.

## Slide 2: Technical landscape — Spreadsheet Ledgers

As Keir mentioned before lunch, water availability is recorded by area teams in spreadsheet ledgers. There are over 100 of them, held across different SharePoint sites by local teams. Although the spreadsheets are version controlled, there may be several different versions in use across areas.

Extracting water availability data directly from these spreadsheets is not considered a viable technical approach. Most of them are live working documents that have not been through the QA process, so the data may not represent the approved position. And programmatically extracting data from spreadsheets of this complexity would be brittle and difficult to maintain.

## Slide 3: Technical landscape — Existing Systems

This diagram captures the existing systems landscape. On the right-hand side, you can see that area teams submit their CAMS Ledger data to the Water Resources QA team, who review and upload the approved data into Water Resources GIS, which is built on ArcGIS Enterprise backed by a Postgres database. This is the internal system used by EA permitting officers and Water Resources QA teams to make licensing decisions.

Currently, the water availability data in Water Resources GIS is not published. It sits on the private, EA-facing side of the boundary. However, there is an established publishing process — the Defra Data Services Platform on the left — which already publishes other geospatial datasets to the public internet using OGC open standards.

Our approach will be to use this existing publishing process to make the water availability data public, so that our service and citizens can access it via the Defra Data Services Platform using standards such as WMS and WFS, without needing access to the internal WR GIS system.

One change that will need to be made to the existing process is to the Python code that uploads the spreadsheet data into WR GIS. Currently, the upload includes water availability classifications but not Hands Off Flow values or Hands Off Flow bands. This upload process will need to be modified so that HOF data is included in the water availability metadata. This change will likely need to be made by the DDTS GIS team, and we have engaged with them to understand how we request changes to this process.

## Slide 4: Technical landscape — Proposed logical architecture

This slide shows the proposed architecture for beta. Everything within the dotted boundary will run on Defra's Core Delivery Platform — CDP — within the Defra AWS subscription. On the left, in the public zone, there will be a frontend service serving GOV.UK pages to citizens. Behind that, in the protected zone, a backend API service and a data aggregation service. All three will be Node.js microservices following CDP's standard patterns. There will be a database for caching geospatial data where there is a need for it for performance reasons.

On the right are the existing external data sources. The water availability data will come from Water Resources GIS, published through the Defra Data Services Platform — that's the piece shown in cyan that requires change, because this data isn't currently published publicly. The Hydrology Data Explorer will provide historic river flow data, and the Catchment Data Explorer will provide additional geospatial data relating to waterbody catchments and operational catchments.

The key point is that the new services we'll be building — shown in pink — will only consume from published APIs. We won't be connecting directly to internal systems. The two changes needed to existing systems are: first, adding HOF values and HOF bands to the water availability data during the spreadsheet upload to WR GIS; and second, publishing that data from WR GIS to the public-facing Defra Data Services Platform using the established publishing process.

## Slide 5: Technical landscape — Services and data sources

This slide summarises the services and data sources I just described. All data sources are published, standards-based services with no bespoke integrations: the Defra Data Services Platform for water availability data (sourced from WR GIS — including availability classifications, assessment point locations, and HOF values/bands), the EA Hydrology Data Explorer for historic river flow data, OS Places API for location search, and potentially an RPA API for land parcel lookup.

A Proof of Concept was built during alpha to explore these technology choices and mitigate technical risks before committing to the beta architecture. I'll share a link to the PoC repo and deployed version in the chat towards the end.

## Slide 6: Tools, technology and open standards

All our technology choices are Defra standard. We'll be using the Core Delivery Platform for hosting, Hapi.js — which is Defra's default Node.js framework — and PostgreSQL with PostGIS for spatial data, which is an OGC standard.

For geospatial data, we'll be using open standards throughout — GeoJSON, WMS, and WFS — consuming data from the Defra Data Services Platform. No proprietary protocols or vendor lock-in.

On the frontend, we'll use the GOV.UK Design System and, if we need it, the Defra Interactive Map component, which has recently been released for general use. Location search will use the OS Places API under Defra's existing licence. The service will be designed with progressive enhancement in mind — the core user needs will be answered in server-rendered HTML without JavaScript. The interactive map, if required, will be an enhancement for users who can use it, not a dependency.

*If asked about cost/lock-in:* CDP abstracts infrastructure costs, all technology is open source, and there are no proprietary licence fees beyond the existing Defra OS Places licence. We can change any component without vendor lock-in.

*If asked why we didn't consider other technology options:* Using Defra defaults is the considered choice. CDP, Node/Hapi, and Postgres have already been through Defra's tools radar and TDA approval — we inherit that due diligence. The service has no unusual technical requirements that would justify deviating — it's a standard web application consuming APIs and serving pages. PostGIS is the one addition beyond the default, and that was validated by the PoC. Choosing non-standard technology would increase cost, reduce the developer pool, and require additional governance — with no benefit for this service.

## Slide 7: Open source code

All code will be published and public on Defra's GitHub. The code will be owned by Defra and published under the Open Government Licence.
The service is also built entirely on open source technology — Node.js, Hapi.js, PostgreSQL, PostGIS, Docker — so there are no proprietary runtime or framework dependencies.
Development will follow the Defra Software Development Standards.

## Slide 8: Secure service — user privacy

The service will collect no personal data — none will be collected, stored, or processed. There will be no user accounts. The only cookies will be related to analytics, with an appropriate banner and opt-out using Defra's standard patterns and components. The data served will be limited to publicly available water availability classifications and gauged flow information. No commercially sensitive data, such as individual abstraction licence details, will be included.

## Slide 9: Reliable service

On quality, we'll follow the Defra Software Development Standards, with static code analysis by SonarCloud on every build, automated and manual testing, accessibility testing against WCAG standards, an IT Health Check before go-live, and performance testing.

On resilience, there's no transactional data — users are querying published environmental data, not creating accounts or submitting forms. That means environments stay naturally consistent, no test data to manage, and disaster recovery is just a redeploy — the data aggregation service repopulates from the published sources.

The service will also be designed to degrade gracefully. If an external API goes down — say the Hydrology Data Explorer — that part of the service will be unavailable, but the rest will continue to work. The water availability classifications will be served from cached data, so the core functionality will remain available even if a source API is temporarily down.

The Proof of Concept validated the caching approach for geospatial data. We saw external API response times of 2 to 60 seconds, often with errors. Local caching brought that down to under a second, consistently. As a note, the historic hydrology data is too large to cache and will be called directly from the API.

For environments and monitoring, we'll use the standard CDP pipeline — dev, test, performance test, and production — with CI/CD through GitHub Actions. Multiple instances will be split across availability zones. And we'll be using CDP's monitoring and alerting tooling.

I'm going to hand over now to JP, who can talk through where we are with technical governance.

*If asked about support/availability:* We're anticipating Tier 3 — standard support, business hours. The service will provide public environmental information — it's not operational or safety-critical.

*If asked about analytics:* Google Analytics 4 (GA4) is the Defra-DDTS standard for CDP services. We'll integrate with the existing Defra GA4 instance.

---

## Glossary

| Abbreviation | Definition |
|---|---|
| API | Application Programming Interface |
| AWS | Amazon Web Services |
| CAMS | Catchment Abstraction Management Strategy |
| CDP | Core Delivery Platform (Defra's managed hosting platform) |
| CI/CD | Continuous Integration / Continuous Deployment |
| DDTS | Digital, Data and Technology Services |
| DR | Disaster Recovery |
| EA | Environment Agency |
| GIS | Geographic Information System |
| HOF | Hands Off Flow |
| ITHC | IT Health Check (penetration testing) |
| OGC | Open Geospatial Consortium |
| OS | Ordnance Survey |
| QA | Quality Assurance |
| RPA | Rural Payments Agency |
| WCAG | Web Content Accessibility Guidelines |
| WFS | Web Feature Service (OGC standard) |
| WMS | Web Map Service (OGC standard) |
| WR GIS | Water Resources Geographic Information System |
