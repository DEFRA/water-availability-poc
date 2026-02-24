-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Waterbody features table
CREATE TABLE waterbody_features (
  id SERIAL PRIMARY KEY,
  waterbody_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255),
  geometry_type VARCHAR(50),
  water_body_type VARCHAR(50),
  geom GEOMETRY(Geometry, 4326),
  properties JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_waterbody_geom ON waterbody_features USING GIST(geom);
CREATE INDEX idx_waterbody_id ON waterbody_features(waterbody_id);

-- Water availability polygons table
CREATE TABLE water_availability_polygons (
  id SERIAL PRIMARY KEY,
  waterbody_id VARCHAR(50),
  camscdsq95 VARCHAR(20),
  geom GEOMETRY(Polygon, 4326),
  properties JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_water_avail_geom ON water_availability_polygons USING GIST(geom);
CREATE INDEX idx_water_avail_wb_id ON water_availability_polygons(waterbody_id);

-- Abstraction licences table
CREATE TABLE abstraction_licences (
  id SERIAL PRIMARY KEY,
  licence_number VARCHAR(50),
  waterbody_id VARCHAR(50),
  purpose VARCHAR(255),
  source_type VARCHAR(100),
  geom GEOMETRY(Point, 4326),
  properties JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_abstraction_geom ON abstraction_licences USING GIST(geom);
CREATE INDEX idx_abstraction_wb_id ON abstraction_licences(waterbody_id);
