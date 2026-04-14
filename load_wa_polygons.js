import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: 5432,
  database: 'water_availability',
  user: 'postgres',
  password: 'postgres'
})

const WFS_URL = 'https://environment.data.gov.uk/spatialdata/water-resource-availability-and-abstraction-reliability-cycle-2/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=Resource_Availability_at_Q95&OUTPUTFORMAT=application/json'

async function loadWAPolygons () {
  try {
    console.log('Fetching water availability polygons from EA WFS...')
    const response = await fetch(WFS_URL)
    const data = await response.json()

    console.log(`Downloaded ${data.features.length} polygons`)

    let inserted = 0
    for (const feature of data.features) {
      const props = feature.properties
      const geom = JSON.stringify(feature.geometry)

      await pool.query(
        `INSERT INTO water_availability_polygons 
         (ea_wb_id, camscdsq95, camscdsq30, camscdsq50, camscdsq70, country, resavail, shape_area, shape_leng, geom, properties)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($10), 27700), 4326), $11)
         ON CONFLICT (ea_wb_id) DO UPDATE SET
           camscdsq95 = EXCLUDED.camscdsq95,
           camscdsq30 = EXCLUDED.camscdsq30,
           camscdsq50 = EXCLUDED.camscdsq50,
           camscdsq70 = EXCLUDED.camscdsq70,
           country = EXCLUDED.country,
           resavail = EXCLUDED.resavail,
           shape_area = EXCLUDED.shape_area,
           shape_leng = EXCLUDED.shape_leng,
           geom = EXCLUDED.geom,
           properties = EXCLUDED.properties,
           updated_at = NOW()`,
        [
          props.ea_wb_id,
          props.camscdsq95,
          props.camscdsq30,
          props.camscdsq50,
          props.camscdsq70,
          props.country,
          props.resavail,
          props.shape_area,
          props.shape_leng,
          geom,
          JSON.stringify(props)
        ]
      )
      inserted++
      if (inserted % 100 === 0) {
        console.log(`Inserted ${inserted}/${data.features.length}`)
      }
    }

    console.log(`Successfully loaded ${inserted} water availability polygons`)
  } catch (error) {
    console.error('Error loading water availability polygons:', error)
    throw error
  } finally {
    await pool.end()
  }
}

loadWAPolygons()
