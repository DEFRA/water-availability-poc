#!/usr/bin/env node
/**
 * Load waterbody features from England.geojson into Postgres
 * Run: node load_waterbodies.js
 */

import pg from 'pg'
import { writeFileSync, readFileSync, existsSync } from 'fs'

const { Pool } = pg

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: 5432,
  database: 'water_availability',
  user: 'postgres',
  password: 'postgres'
})

const GEOJSON_FILE = 'england_waterbodies.geojson'
const GEOJSON_URL = 'https://environment.data.gov.uk/catchment-planning/England.geojson'

async function downloadEnglandData () {
  if (existsSync(GEOJSON_FILE)) {
    console.log('Using existing england_waterbodies.geojson')
    return
  }

  console.log('Downloading England.geojson...')
  const response = await fetch(GEOJSON_URL)
  const data = await response.text()
  writeFileSync(GEOJSON_FILE, data)
  console.log('Download complete')
}

async function loadWaterbodies () {
  console.log('Loading waterbodies into database...')
  const data = JSON.parse(readFileSync(GEOJSON_FILE, 'utf8'))

  let loaded = 0
  for (const feature of data.features) {
    const props = feature.properties
    const geom = JSON.stringify(feature.geometry)

    await pool.query(
      `INSERT INTO waterbody_features (waterbody_id, name, geometry_type, water_body_type, geom, properties)
       VALUES ($1, $2, $3, $4, ST_GeomFromGeoJSON($5), $6)
       ON CONFLICT (waterbody_id) DO UPDATE SET
         name = EXCLUDED.name,
         geometry_type = EXCLUDED.geometry_type,
         water_body_type = EXCLUDED.water_body_type,
         geom = EXCLUDED.geom,
         properties = EXCLUDED.properties,
         updated_at = NOW()`,
      [props.id, props.name, props['geometry-type'], props['water-body-type'], geom, props]
    )

    loaded++
    if (loaded % 100 === 0) {
      console.log(`Loaded ${loaded} waterbodies...`)
    }
  }

  console.log(`Loaded ${loaded} waterbodies total`)
}

try {
  await downloadEnglandData()
  await loadWaterbodies()
  console.log('Success!')
} catch (error) {
  console.error('Error:', error)
} finally {
  await pool.end()
}
