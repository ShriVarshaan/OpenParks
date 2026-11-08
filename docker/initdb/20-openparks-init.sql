-- Runs once, after the image's 10_postgis.sh, on a fresh volume.
-- The image installs extra PostGIS extensions the app doesn't use; Prisma treats them as
-- schema drift. Drop them all, postgis included: the Prisma migration creates postgis itself.
DROP EXTENSION IF EXISTS postgis_tiger_geocoder;
DROP EXTENSION IF EXISTS postgis_topology;
DROP EXTENSION IF EXISTS fuzzystrmatch;
DROP EXTENSION IF EXISTS postgis;
DROP SCHEMA IF EXISTS tiger CASCADE;
DROP SCHEMA IF EXISTS tiger_data CASCADE;
DROP SCHEMA IF EXISTS topology CASCADE;

-- Separate database for `npm run test:db`, so tests never wipe the dev data.
-- Plain template: the Prisma migration installs postgis there too.
CREATE DATABASE openparks_test;
