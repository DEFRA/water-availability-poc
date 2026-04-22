import Hapi from '@hapi/hapi'
import Inert from '@hapi/inert'
import H2o2 from '@hapi/h2o2'
import pg from 'pg'
import { readFileSync, writeFileSync, existsSync, statSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Pool } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const hofValues = JSON.parse(readFileSync(join(__dirname, 'hof_values.json'), 'utf8'))
const apWaterbodyMapping = JSON.parse(readFileSync(join(__dirname, 'ap_waterbody_mapping.json'), 'utf8'))

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: 5432,
  database: 'water_availability',
  user: 'postgres',
  password: 'postgres'
})

// Load and enrich CAMS Assessment Points at startup
let enrichedCamsAps = null

async function loadCamsAps () {
  const cacheFile = join(__dirname, 'cams_aps_cache.json')
  const isDev = process.env.NODE_ENV !== 'production'

  // Check cache in dev mode (7 day expiry)
  if (isDev && existsSync(cacheFile)) {
    const stats = statSync(cacheFile)
    const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60)
    if (ageHours < 168) {
      console.log('Loading CAMS Assessment Points from cache...')
      enrichedCamsAps = JSON.parse(readFileSync(cacheFile, 'utf8'))
      console.log(`Loaded ${enrichedCamsAps.features.length} CAMS Assessment Points from cache`)
      return
    }
  }

  console.log('Loading CAMS Assessment Points from API...')
  const allFeatures = []
  const limit = 100
  let startIndex = 0

  while (true) {
    const apUrl = `${CAMS_AP_URL}?f=application/geo%2Bjson&limit=${limit}&startIndex=${startIndex}`
    const apResponse = await fetch(apUrl)

    if (!apResponse.ok) {
      const text = await apResponse.text()
      console.error('Response body:', text.substring(0, 500))
      throw new Error(`CAMS AP API returned ${apResponse.status}`)
    }

    const apData = await apResponse.json()
    allFeatures.push(...apData.features)
    console.log(`Loaded ${allFeatures.length} of ${apData.numberMatched} CAMS Assessment Points`)

    if (allFeatures.length >= apData.numberMatched) break
    startIndex += limit
  }

  // Enrich APs with station GUIDs from HoF data and waterbody IDs
  allFeatures.forEach(ap => {
    const compositeKey = `${ap.properties.camsledger}|${ap.properties.ea_wb_id}`
    const hofData = hofValues[compositeKey]

    if (hofData) {
      if (hofData.station_guid) {
        ap.properties.stationGuid = hofData.station_guid
        ap.properties.measures = 'flow'
        if (hofData.rloi_id) {
          ap.properties.rloi_id = hofData.rloi_id
        }
        if (hofData.distance_m !== undefined) {
          ap.properties.gauge_distance_m = hofData.distance_m
        }
      }
      ap.properties.hof_value = hofData.hof_value
      ap.properties.hof_number = hofData.hof_number
    }

    // Add waterbody ID from mapping (using EA_WB_ID only)
    const waterbodyId = apWaterbodyMapping[ap.properties.ea_wb_id]
    if (waterbodyId) {
      ap.properties.waterbody_id = waterbodyId
    }
  })

  enrichedCamsAps = { type: 'FeatureCollection', features: allFeatures }
  console.log(`Loaded ${allFeatures.length} CAMS Assessment Points`)

  // Save cache in dev mode
  if (isDev) {
    writeFileSync(cacheFile, JSON.stringify(enrichedCamsAps, null, 2))
    console.log('Saved CAMS Assessment Points to cache')
  }
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// Service URLs
const BGS_WMS_URL = 'https://map.bgs.ac.uk/arcgis/services/GeoIndex_Onshore/hydrogeology/MapServer/WmsServer'
const EA_WMS_URL = 'https://environment.data.gov.uk/spatialdata/water-resource-availability-and-abstraction-reliability-cycle-2/wms'
const POSTCODES_API_URL = 'https://api.postcodes.io/postcodes'
const CAMS_AP_URL = 'https://environment.data.gov.uk/geoservices/datasets/394cde56-5cf9-42bf-8d20-86c182f9ce68/ogc/features/v1/collections/ea_catchment_abstraction_management_strategy_assessment_points/items'
const ABSTRACTION_LICENCES_URL = 'https://services1.arcgis.com/JZM7qJpmv7vJ0Hzx/ArcGIS/rest/services/Help_for_licence_trading_Abstraction_licence_points/FeatureServer/0/query'

const server = Hapi.server({
  port: 3000,
  host: 'localhost'
})

await server.register([Inert, H2o2])

server.route({
  method: 'GET',
  path: '/',
  handler: (request, h) => h.file('postcode.html')
})

server.route({
  method: 'GET',
  path: '/results',
  handler: (request, h) => h.file('results.html')
})

server.route({
  method: 'GET',
  path: '/map',
  handler: (request, h) => h.file('map.html')
})

server.route({
  method: 'GET',
  path: '/hydrology-wms',
  handler: {
    proxy: {
      uri: `${BGS_WMS_URL}{query}`,
      passThrough: true
    }
  }
})

server.route({
  method: 'POST',
  path: '/postcode',
  handler: async (request, h) => {
    const { postcode } = request.payload

    try {
      const response = await fetch(`${POSTCODES_API_URL}/${postcode}`)
      const data = await response.json()

      if (data.status === 200) {
        return {
          postcode,
          lat: data.result.latitude,
          lng: data.result.longitude
        }
      }

      return h.response({ error: 'Invalid postcode' }).code(400)
    } catch (error) {
      console.error('Fetch error:', error)
      return h.response({ error: 'Service unavailable' }).code(500)
    }
  }
})

server.route({
  method: 'GET',
  path: '/water-availability-wms',
  handler: {
    proxy: {
      uri: `${EA_WMS_URL}{query}`,
      passThrough: true
    }
  }
})

server.route({
  method: 'GET',
  path: '/water-availability-polygons',
  handler: async (request, h) => {
    const { bbox } = request.query
    if (!bbox) {
      return h.response({ error: 'bbox parameter required' }).code(400)
    }

    try {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(parseFloat)

      const result = await pool.query(
        `SELECT 
           ea_wb_id,
           camscdsq95,
           ST_AsGeoJSON(geom)::json as geometry
         FROM water_availability_polygons
         WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)`,
        [minLng, minLat, maxLng, maxLat]
      )

      const features = result.rows.map(row => ({
        type: 'Feature',
        geometry: row.geometry,
        properties: {
          ea_wb_id: row.ea_wb_id,
          camscdsq95: row.camscdsq95
        }
      }))

      return { type: 'FeatureCollection', features }
    } catch (error) {
      console.error('[ERROR] water-availability-polygons:', error)
      return h.response({ error: 'Failed to fetch polygons' }).code(500)
    }
  }
})

server.route({
  method: 'GET',
  path: '/water-availability-info',
  handler: {
    proxy: {
      mapUri: (request) => {
        const { bbox, width, height, x, y } = request.query
        const query = new URLSearchParams({
          SERVICE: 'WMS',
          VERSION: '1.3.0',
          REQUEST: 'GetFeatureInfo',
          LAYERS: 'Resource_Availability_at_Q95',
          QUERY_LAYERS: 'Resource_Availability_at_Q95',
          STYLES: '',
          BBOX: bbox,
          FEATURE_COUNT: '10',
          HEIGHT: height,
          WIDTH: width,
          FORMAT: 'image/png',
          INFO_FORMAT: 'application/json',
          CRS: 'EPSG:4326',
          I: x,
          J: y
        })
        return { uri: `${EA_WMS_URL}?${query.toString()}` }
      },
      passThrough: true
    }
  }
})

server.route({
  method: 'GET',
  path: '/nearby-catchments',
  handler: async (request, h) => {
    const start = Date.now()
    const { lat, lng, radius = 1000 } = request.query

    try {
      // Convert radius to degrees (approximate)
      const radiusInDegrees = parseFloat(radius) / 111000
      const point = `POINT(${parseFloat(lng)} ${parseFloat(lat)})`

      // Query Postgres for polygons within radius
      const result = await pool.query(
        `SELECT 
           ea_wb_id,
           camscdsq95,
           camscdsq30,
           camscdsq50,
           camscdsq70,
           country,
           resavail,
           shape_area,
           shape_leng,
           ST_AsGeoJSON(geom)::json as geometry,
           properties
         FROM water_availability_polygons
         WHERE ST_DWithin(
           geom,
           ST_SetSRID(ST_GeomFromText($1), 4326),
           $2
         )`,
        [point, radiusInDegrees]
      )

      console.log(`[TIMING] nearby-catchments (postgres): ${Date.now() - start}ms, rows: ${result.rows.length}`)

      // Transform to GeoJSON FeatureCollection
      const features = result.rows.map(row => ({
        type: 'Feature',
        geometry: row.geometry,
        properties: {
          ea_wb_id: row.ea_wb_id,
          camscdsq95: row.camscdsq95,
          camscdsq30: row.camscdsq30,
          camscdsq50: row.camscdsq50,
          camscdsq70: row.camscdsq70,
          country: row.country,
          resavail: row.resavail,
          shape_area: row.shape_area,
          shape_leng: row.shape_leng
        }
      }))

      return { type: 'FeatureCollection', features }
    } catch (error) {
      console.error('[ERROR] nearby-catchments:', error)
      return h.response({ error: 'Failed to fetch catchments' }).code(500)
    }
  }
})

server.route({
  method: 'GET',
  path: '/waterbody/{id}',
  handler: async (request, h) => {
    const start = Date.now()
    const { id } = request.params

    try {
      // Only fetch RiverLine features - Catchment polygons come from WA polygons
      const result = await pool.query(
        `SELECT 
           waterbody_id,
           name,
           geometry_type,
           water_body_type,
           ST_AsGeoJSON(geom)::json as geometry,
           properties
         FROM waterbody_features 
         WHERE waterbody_id = $1 
         AND geometry_type = 'http://environment.data.gov.uk/catchment-planning/def/geometry/RiverLine'`,
        [id]
      )

      console.log(`[TIMING] waterbody/${id} (postgres): ${Date.now() - start}ms, rows: ${result.rows.length}`)

      const features = result.rows.map(row => ({
        type: 'Feature',
        geometry: row.geometry,
        properties: {
          ...row.properties,
          id: row.waterbody_id,
          name: row.name,
          'geometry-type': row.geometry_type,
          'water-body-type': row.water_body_type
        }
      }))

      return { type: 'FeatureCollection', features }
    } catch (error) {
      console.error(`[ERROR] waterbody/${id}:`, error.message)
      return h.response({ type: 'FeatureCollection', features: [] }).code(200)
    }
  }
})

// Get waterbody names by IDs
server.route({
  method: 'GET',
  path: '/waterbody-names',
  handler: async (request, h) => {
    const { ids } = request.query
    if (!ids) return {}

    const idArray = ids.split(',').filter(id => id)
    if (idArray.length === 0) return {}

    try {
      const result = await pool.query(
        'SELECT DISTINCT waterbody_id, name FROM waterbody_features WHERE waterbody_id = ANY($1)',
        [idArray]
      )

      const names = {}
      result.rows.forEach(row => {
        names[row.waterbody_id] = row.name
      })

      return names
    } catch (error) {
      console.error('[ERROR] waterbody-names:', error.message)
      return {}
    }
  }
})

server.route({
  method: 'GET',
  path: '/monitoring-sites',
  handler: (request, h) => {
    if (!enrichedCamsAps) {
      return h.response({ error: 'CAMS Assessment Points not loaded yet' }).code(503)
    }
    return enrichedCamsAps
  }
})

server.route({
  method: 'GET',
  path: '/abstraction-licences',
  handler: async (request, h) => {
    try {
      const allFeatures = []
      let offset = 0
      const limit = 1000
      let exceededTransferLimit = true

      while (exceededTransferLimit) {
        const query = new URLSearchParams({
          where: '1=1',
          outFields: '*',
          f: 'json',
          outSR: '4326',
          resultRecordCount: limit,
          resultOffset: offset
        })

        // Note: Spatial queries don't seem to work on this ArcGIS service
        // Load all and let Leaflet filter by viewport

        const url = `${ABSTRACTION_LICENCES_URL}?${query.toString()}`
        console.log('Fetching abstraction licences:', url)
        const response = await fetch(url)
        const data = await response.json()
        console.log('Response:', { featureCount: data.features?.length, exceededTransferLimit: data.exceededTransferLimit })

        if (data.features && data.features.length > 0) {
          allFeatures.push(...data.features)
          offset += limit
          exceededTransferLimit = data.exceededTransferLimit || false
        } else {
          exceededTransferLimit = false
        }
      }

      // Convert to GeoJSON
      const geojson = {
        type: 'FeatureCollection',
        features: allFeatures.map(feature => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [feature.geometry.x, feature.geometry.y]
          },
          properties: feature.attributes
        }))
      }

      return geojson
    } catch (error) {
      console.error('Abstraction licences fetch error:', error)
      return h.response({ error: 'Failed to fetch abstraction licences' }).code(500)
    }
  }
})

server.route({
  method: 'GET',
  path: '/abstraction-licences-by-waterbody/{id}',
  handler: async (request, h) => {
    const start = Date.now()
    const waterbodyId = request.params.id

    try {
      const query = new URLSearchParams({
        where: `WFD_Waterbody_ID = '${waterbodyId}'`,
        outFields: '*',
        f: 'json',
        outSR: '4326'
      })

      const url = `${ABSTRACTION_LICENCES_URL}?${query.toString()}`
      const response = await fetch(url)
      const data = await response.json()
      console.log(`[TIMING] abstraction-licences-by-waterbody/${waterbodyId}: ${Date.now() - start}ms`)

      const licences = data.features ? data.features.map(f => f.attributes) : []
      return licences
    } catch (error) {
      console.error('Abstraction licences by waterbody fetch error:', error)
      return h.response({ error: 'Failed to fetch abstraction licences' }).code(500)
    }
  }
})

server.route({
  method: 'GET',
  path: '/hof/{camsArea}/{apId*}',
  handler: (request, h) => {
    const { camsArea, apId } = request.params
    const compositeKey = `${camsArea}|${apId}`
    const hofData = hofValues[compositeKey]

    if (hofData === undefined) {
      return h.response({ error: 'HoF value not found for this assessment point' }).code(404)
    }

    return {
      compositeKey,
      hofValue: hofData.hof_value,
      apNumber: hofData.ap_number,
      apName: hofData.ap_name,
      hofNumber: hofData.hof_number,
      camsArea: hofData.cams_area,
      stationGuid: hofData.station_guid
    }
  }
})

// Load CAMS APs before starting server
await loadCamsAps()

// Test database connection
try {
  const result = await pool.query('SELECT PostGIS_Version()')
  console.log('Database connected. PostGIS version:', result.rows[0].postgis_version)
} catch (error) {
  console.error('Database connection failed:', error.message)
  process.exit(1)
}

await server.start()
console.log('Server running on %s', server.info.uri)
