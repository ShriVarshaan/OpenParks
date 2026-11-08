-- Reports used to be saved with SRID 4236 (a typo for 4326). The coordinates were already
-- WGS 84 longitude/latitude, so only the SRID label is wrong: relabel those rows.
UPDATE "SafetyReport"
SET location = ST_SetSRID(location::geometry, 4326)::geography
WHERE ST_SRID(location::geometry) <> 4326;

-- From now on the database itself rejects anything that is not a 4326 point.
ALTER TABLE "SafetyReport"
  ALTER COLUMN location TYPE geography(Point, 4326) USING location::geography(Point, 4326);
