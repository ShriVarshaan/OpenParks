# Park data snapshots

Park, trail and amenity data © OpenStreetMap contributors, available under the Open Database License (ODbL).
See https://www.openstreetmap.org/copyright.

| File | Contents |
|---|---|
| `parks.geojson` | Named `leisure=park` areas (polygons), with `osm_type`, `osm_id`, `name` |
| `trails.geojson` | Footways, paths, cycleways, bridleways and tracks inside those parks |
| `amenities.geojson` | Benches, bins, playgrounds, toilets, cafés, parking, etc. inside those parks |

These files are committed so that setting up the app needs no network access:
`npm run setup` (or `npm run db:seed`) loads them into the database.

## Regenerating or adding parks

1. Edit `backend/scripts/parks.config.json`. Add an entry to `areas` (`bbox` is `[south, west, north, east]`),
   or add `"way/<id>"` / `"relation/<id>"` to `exclude` to drop a park.
   An area can also have a `boundary` (`"relation/<id>"` of an OSM administrative boundary). Parks are then
   limited to that boundary, so a bbox around an irregular city doesn't pick up its neighbours' parks.
   The current snapshot covers the City of Birmingham (`relation/162378`).
2. From `backend/`, run `npm run parks:fetch`. It queries the public Overpass API, retries if the server is busy,
   and only overwrites these files if every request succeeds.
3. Run `npm run db:seed` to load the new data, then commit the updated `.geojson` files.

A park that is no longer in the snapshot is deleted by the next `db:seed`, unless someone has reviewed it
or filed a safety report on it. Those parks are kept (with a warning) so that history isn't lost,
but they no longer get trails or amenities.
