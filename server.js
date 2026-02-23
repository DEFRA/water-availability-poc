import Hapi from '@hapi/hapi'
import Inert from '@hapi/inert'
import H2o2 from '@hapi/h2o2'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const hofValues = JSON.parse(readFileSync(join(__dirname, 'hof_values.json'), 'utf8'))

// Load and enrich CAMS Assessment Points at startup
let enrichedCamsAps = null

async function loadCamsAps () {
  console.log('Loading CAMS Assessment Points...')
  const apUrl = `${CAMS_AP_URL}?f=application/geo%2Bjson&limit=2000`
  const apResponse = await fetch(apUrl)
  const apData = await apResponse.json()

  // Enrich APs with station GUIDs from HoF data
  apData.features.forEach(ap => {
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
  })

  enrichedCamsAps = apData
  console.log(`Loaded ${apData.features.length} CAMS Assessment Points`)
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// Service URLs
const BGS_WMS_URL = 'https://map.bgs.ac.uk/arcgis/services/GeoIndex_Onshore/hydrogeology/MapServer/WmsServer'
const EA_WMS_URL = 'https://environment.data.gov.uk/spatialdata/water-resource-availability-and-abstraction-reliability-cycle-2/wms'
const EA_WFS_URL = 'https://environment.data.gov.uk/spatialdata/water-resource-availability-and-abstraction-reliability-cycle-2/wfs'
const POSTCODES_API_URL = 'https://api.postcodes.io/postcodes'
const CATCHMENT_API_URL = 'https://environment.data.gov.uk/catchment-planning/WaterBody'
const CAMS_AP_URL = 'https://environment.data.gov.uk/geoservices/datasets/394cde56-5cf9-42bf-8d20-86c182f9ce68/ogc/features/v1/collections/ea_catchment_abstraction_management_strategy_assessment_points/items'
const RIVER_CATCHMENT_URL = 'https://services1.arcgis.com/JZM7qJpmv7vJ0Hzx/ArcGIS/rest/services/WFD_Cycle_2_River_catchment_classification/FeatureServer/5/query'
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
  path: '/water-availability-wfs',
  handler: {
    proxy: {
      uri: `${EA_WFS_URL}{query}`,
      passThrough: true
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
  handler: {
    proxy: {
      mapUri: (request) => {
        const { lat, lng, radius = 1000 } = request.query

        // Calculate precise bbox for radius (1 degree ≈ 111km at equator)
        const radiusInDegrees = parseFloat(radius) / 111000
        const minLng = parseFloat(lng) - radiusInDegrees
        const minLat = parseFloat(lat) - radiusInDegrees
        const maxLng = parseFloat(lng) + radiusInDegrees
        const maxLat = parseFloat(lat) + radiusInDegrees

        const query = new URLSearchParams({
          SERVICE: 'WFS',
          VERSION: '2.0.0',
          REQUEST: 'GetFeature',
          TYPENAME: 'Resource_Availability_at_Q95',
          OUTPUTFORMAT: 'application/json',
          SRSNAME: 'EPSG:4326',
          BBOX: `${minLng},${minLat},${maxLng},${maxLat},EPSG:4326`
        })

        return { uri: `${EA_WFS_URL}?${query.toString()}` }
      },
      passThrough: true
    }
  }
})

server.route({
  method: 'GET',
  path: '/waterbody/{id}',
  handler: async (request, h) => {
    const { id } = request.params

    try {
      const response = await fetch(`${CATCHMENT_API_URL}/${id}.geojson`)

      if (!response.ok) {
        console.error(`Waterbody API returned ${response.status} for ${id}`)
        return h.response({ error: 'Waterbody not found', features: [] }).code(404)
      }

      const data = await response.json()

      if (!data.features) {
        console.error(`Waterbody ${id} returned invalid data:`, data)
        return h.response({ type: 'FeatureCollection', features: [] }).code(200)
      }

      return data
    } catch (error) {
      console.error('Waterbody fetch error:', error)
      return h.response({ type: 'FeatureCollection', features: [] }).code(200)
    }
  }
})

server.route({
  method: 'GET',
  path: '/operational-catchment/{id}',
  handler: async (request, h) => {
    const { id } = request.params

    try {
      const response = await fetch(`https://environment.data.gov.uk/catchment-planning/OperationalCatchment/${id}.geojson`)

      if (!response.ok) {
        console.error(`Operational catchment API returned ${response.status} for ${id}`)
        return h.response({ type: 'FeatureCollection', features: [] }).code(200)
      }

      const data = await response.json()

      if (!data.features) {
        console.error(`Operational catchment ${id} returned invalid data:`, data)
        return h.response({ type: 'FeatureCollection', features: [] }).code(200)
      }

      return data
    } catch (error) {
      console.error('Operational catchment fetch error:', error)
      return h.response({ type: 'FeatureCollection', features: [] }).code(200)
    }
  }
})

server.route({
  method: 'GET',
  path: '/operational-catchments-by-ids',
  handler: {
    proxy: {
      mapUri: (request) => {
        const { ids } = request.query

        // Build WHERE clause for specific waterbody IDs
        const idList = ids.split(',').map(id => `'${id.trim()}'`).join(',')
        const whereClause = `WB_ID IN (${idList})`

        const query = new URLSearchParams({
          where: whereClause,
          outFields: 'WB_ID,WB_NAME,OPCAT_ID,OPCAT_NAME',
          f: 'json'
        })

        return { uri: `${RIVER_CATCHMENT_URL}?${query.toString()}` }
      },
      passThrough: true
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

await server.start()
console.log('Server running on %s', server.info.uri)
