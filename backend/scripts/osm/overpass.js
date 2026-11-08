import { TRAIL_HIGHWAYS, AMENITY_TYPES } from "./transform.js";

export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "OpenParks-seed/1.0";

// OSM tag values to query (the icon key "toilet" is "toilets" in OSM)
const OSM_AMENITY_VALUES = AMENITY_TYPES.filter((t) => t !== "playground").map((t) =>
  t === "toilet" ? "toilets" : t
);

// bbox is [south, west, north, east] — Overpass order
export function buildQueries(bbox) {
  const b = `(${bbox.join(",")})`;
  const header = "[out:json][timeout:120];";
  // Trails and amenities are limited to the named parks themselves, not the whole bbox.
  const parkAreas = `(way["leisure"="park"]["name"]${b};relation["leisure"="park"]["name"]${b};)->.parks;.parks map_to_area->.parkArea;`;

  return {
    parks: `${header}(way["leisure"="park"]["name"]${b};relation["leisure"="park"]["name"]${b};);out geom;`,
    trails: `${header}${parkAreas}way(area.parkArea)["highway"~"^(${TRAIL_HIGHWAYS.join("|")})$"];out geom;`,
    amenities: `${header}${parkAreas}(nwr(area.parkArea)["amenity"~"^(${OSM_AMENITY_VALUES.join("|")})$"];nwr(area.parkArea)["leisure"="playground"];);out center;`,
  };
}

// The public Overpass server is often briefly overloaded; these statuses are worth retrying.
const TRANSIENT_STATUSES = new Set([429, 502, 503, 504]);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchOverpass(query, fetchImpl = fetch, { retries = 4, baseDelayMs = 5000, sleep = wait } = {}) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetchImpl(OVERPASS_URL, {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: query }).toString(),
    });
    if (response.ok) {
      const data = await response.json();
      // A busy server can answer 200 with truncated data and a "runtime error" remark
      // (timeout / out of memory). Treat that as a transient failure, never as data.
      if (typeof data.remark !== "string" || !/error/i.test(data.remark)) {
        return data;
      }
      if (attempt >= retries) {
        throw new Error(`Overpass runtime error: ${data.remark}`);
      }
    } else if (!TRANSIENT_STATUSES.has(response.status) || attempt >= retries) {
      throw new Error(`Overpass HTTP ${response.status}`);
    }
    await sleep(baseDelayMs * 2 ** attempt); // 5s, 10s, 20s, 40s
  }
}
