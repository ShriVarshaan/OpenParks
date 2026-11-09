import { TRAIL_HIGHWAYS, AMENITY_TYPES } from "./transform.js";

export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "OpenParks-seed/1.0";

// OSM tag values to query (the icon key "toilet" is "toilets" in OSM)
const OSM_AMENITY_VALUES = AMENITY_TYPES.filter((t) => t !== "playground").map((t) =>
  t === "toilet" ? "toilets" : t
);

// bbox is [south, west, north, east] — Overpass order.
// boundary (optional) is "relation/<id>" of an administrative area, such as a city.
// Parks are then limited to that area, so a bbox drawn around an irregular city
// doesn't pull in parks from its neighbours.
export function buildQueries(bbox, boundary) {
  let b = `(${bbox.join(",")})`;
  let header = "[out:json][timeout:180];";
  if (boundary !== undefined) {
    const match = /^relation\/(\d+)$/.exec(boundary);
    if (!match) {
      throw new Error(`boundary must be "relation/<id>", got "${boundary}"`);
    }
    header += `rel(${match[1]});map_to_area->.boundary;`;
    b += "(area.boundary)";
  }
  const parkSet = `(way["leisure"="park"]["name"]${b};relation["leisure"="park"]["name"]${b};)`;
  // Trails and amenities are limited to the named parks themselves, not the whole bbox.
  const parkAreas = `${parkSet}->.parks;.parks map_to_area->.parkArea;`;

  return {
    parks: `${header}${parkSet};out geom;`,
    trails: `${header}${parkAreas}way(area.parkArea)["highway"~"^(${TRAIL_HIGHWAYS.join("|")})$"];out geom;`,
    amenities: `${header}${parkAreas}(nwr(area.parkArea)["amenity"~"^(${OSM_AMENITY_VALUES.join("|")})$"];nwr(area.parkArea)["leisure"="playground"];);out center;`,
  };
}

// The public Overpass server is often briefly overloaded; these statuses are worth retrying.
const TRANSIENT_STATUSES = new Set([429, 502, 503, 504]);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchOverpass(query, fetchImpl = fetch, { retries = 4, baseDelayMs = 5000, sleep = wait } = {}) {
  for (let attempt = 0; ; attempt++) {
    let response;
    try {
      response = await fetchImpl(OVERPASS_URL, {
        method: "POST",
        headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }).toString(),
      });
    } catch (err) {
      // Network failure (connection reset, DNS, …): transient, retry like a 5xx.
      if (attempt >= retries) throw err;
      await sleep(baseDelayMs * 2 ** attempt);
      continue;
    }
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
