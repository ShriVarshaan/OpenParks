import { jest } from "@jest/globals";
import fs from "fs";
import os from "os";
import path from "path";
import { buildQueries, fetchOverpass } from "../../scripts/osm/overpass.js";
import { runFetch } from "../../scripts/fetch-parks.js";

const BBOX = [52.42, -1.96, 52.48, -1.86];

const ok = (data) => ({ ok: true, status: 200, json: async () => data });

const PARKS_RESPONSE = {
  elements: [
    {
      type: "way",
      id: 1,
      tags: { leisure: "park", name: "A Park" },
      nodes: [1, 2, 3, 1],
      geometry: [
        { lat: 52.44, lon: -1.91 },
        { lat: 52.44, lon: -1.9 },
        { lat: 52.45, lon: -1.9 },
        { lat: 52.44, lon: -1.91 },
      ],
    },
  ],
};
const TRAILS_RESPONSE = {
  elements: [
    {
      type: "way",
      id: 11,
      tags: { highway: "footway" },
      nodes: [1, 3],
      geometry: [
        { lat: 52.44, lon: -1.91 },
        { lat: 52.45, lon: -1.9 },
      ],
    },
  ],
};
const AMENITIES_RESPONSE = {
  elements: [{ type: "node", id: 5, lat: 52.441, lon: -1.905, tags: { amenity: "bench" } }],
};

const config = { areas: [{ name: "Test", bbox: BBOX }], exclude: [] };

let outDir;
beforeEach(() => {
  outDir = fs.mkdtempSync(path.join(os.tmpdir(), "openparks-fetch-"));
});
afterEach(() => {
  fs.rmSync(outDir, { recursive: true, force: true });
});

describe("buildQueries", () => {
  test("parks query selects named parks in the bbox with full geometry", () => {
    const { parks } = buildQueries(BBOX);
    expect(parks).toContain("(52.42,-1.96,52.48,-1.86)");
    expect(parks).toContain("out geom");
  });

  test("without a boundary, no query references a boundary area", () => {
    for (const q of Object.values(buildQueries(BBOX))) {
      expect(q).not.toContain("area.boundary");
    }
  });

  test("with a boundary relation, every query clips parks to that boundary", () => {
    const queries = buildQueries(BBOX, "relation/162378");
    for (const q of Object.values(queries)) {
      expect(q).toContain("rel(162378);map_to_area->.boundary;");
      expect(q).toContain('way["leisure"="park"]["name"](52.42,-1.96,52.48,-1.86)(area.boundary)');
      expect(q).toContain('relation["leisure"="park"]["name"](52.42,-1.96,52.48,-1.86)(area.boundary)');
    }
  });

  test("rejects a boundary that is not a relation/<id> reference", () => {
    expect(() => buildQueries(BBOX, "way/1")).toThrow(/relation\/<id>/);
    expect(() => buildQueries(BBOX, "Birmingham")).toThrow(/relation\/<id>/);
  });
});

describe("fetchOverpass", () => {
  const noSleep = async () => {};

  test("rejects with the HTTP status when Overpass stays rate-limited", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 429 });
    await expect(fetchOverpass("[out:json];", fetchImpl, { sleep: noSleep })).rejects.toThrow("Overpass HTTP 429");
  });

  test("retries a transient 502 and returns the later success", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 502 })
      .mockResolvedValueOnce(ok({ elements: [] }));

    await expect(fetchOverpass("[out:json];", fetchImpl, { sleep: noSleep })).resolves.toEqual({ elements: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test("gives up after the configured number of retries", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 504 });

    await expect(fetchOverpass("[out:json];", fetchImpl, { retries: 2, sleep: noSleep })).rejects.toThrow(
      "Overpass HTTP 504"
    );
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  test("treats a 200 response carrying a runtime-error remark as a failure", async () => {
    const partial = ok({ elements: [], remark: "runtime error: Query timed out in \"query\" at line 1 after 121 seconds." });
    const fetchImpl = jest.fn().mockResolvedValue(partial);

    await expect(fetchOverpass("[out:json];", fetchImpl, { retries: 1, sleep: noSleep })).rejects.toThrow(
      "Overpass runtime error"
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test("retries a network error and returns the later success", async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(ok({ elements: [] }));

    await expect(fetchOverpass("[out:json];", fetchImpl, { sleep: noSleep })).resolves.toEqual({ elements: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test("gives up on a persistent network error with its message", async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError("fetch failed"));

    await expect(fetchOverpass("[out:json];", fetchImpl, { retries: 1, sleep: noSleep })).rejects.toThrow(
      "fetch failed"
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test("does not retry a client error such as 400", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 400 });

    await expect(fetchOverpass("[out:json];", fetchImpl, { sleep: noSleep })).rejects.toThrow("Overpass HTTP 400");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("runFetch", () => {
  test("writes parks, trails and amenities snapshots", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(ok(PARKS_RESPONSE))
      .mockResolvedValueOnce(ok(TRAILS_RESPONSE))
      .mockResolvedValueOnce(ok(AMENITIES_RESPONSE));

    const counts = await runFetch({ config, outDir, fetchImpl });

    expect(counts).toEqual({ parks: 1, trails: 1, amenities: 1 });
    const parks = JSON.parse(fs.readFileSync(path.join(outDir, "parks.geojson"), "utf8"));
    expect(parks.features).toHaveLength(1);
    expect(parks.features[0].properties).toEqual({ osm_type: "way", osm_id: "1", name: "A Park" });
    expect(fs.existsSync(path.join(outDir, "trails.geojson"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "amenities.geojson"))).toBe(true);
  });

  test("does not write snapshots when any query fails", async () => {
    fs.writeFileSync(path.join(outDir, "parks.geojson"), "OLD");
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(ok(PARKS_RESPONSE))
      .mockResolvedValueOnce(ok(TRAILS_RESPONSE))
      .mockResolvedValue({ ok: false, status: 504 });

    await expect(
      runFetch({ config, outDir, fetchImpl, overpassOptions: { sleep: async () => {} } })
    ).rejects.toThrow("Overpass HTTP 504");
    expect(fs.readFileSync(path.join(outDir, "parks.geojson"), "utf8")).toBe("OLD");
  });

  test("keeps existing snapshots when Overpass returns partial data with an error remark", async () => {
    fs.writeFileSync(path.join(outDir, "trails.geojson"), "OLD");
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(ok(PARKS_RESPONSE))
      .mockResolvedValue(ok({ elements: [], remark: "runtime error: Query run out of memory using about 2048 MB of RAM." }));

    await expect(
      runFetch({ config, outDir, fetchImpl, overpassOptions: { sleep: async () => {} } })
    ).rejects.toThrow("Overpass runtime error");
    expect(fs.readFileSync(path.join(outDir, "trails.geojson"), "utf8")).toBe("OLD");
  });

  test("refuses to run with no areas configured and writes nothing", async () => {
    const fetchImpl = jest.fn();

    await expect(runFetch({ config: { areas: [], exclude: [] }, outDir, fetchImpl })).rejects.toThrow(
      "no areas"
    );
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(fs.readdirSync(outDir)).toEqual([]);
  });

  test("refuses to write snapshots when an area returns no parks", async () => {
    fs.writeFileSync(path.join(outDir, "parks.geojson"), "OLD");
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(ok({ elements: [] }))
      .mockResolvedValueOnce(ok(TRAILS_RESPONSE))
      .mockResolvedValueOnce(ok(AMENITIES_RESPONSE));

    await expect(runFetch({ config, outDir, fetchImpl })).rejects.toThrow('Area "Test" returned no parks');
    expect(fs.readFileSync(path.join(outDir, "parks.geojson"), "utf8")).toBe("OLD");
  });

  test("de-duplicates parks that appear in overlapping areas", async () => {
    const fetchImpl = jest.fn();
    for (let i = 0; i < 2; i++) {
      fetchImpl
        .mockResolvedValueOnce(ok(PARKS_RESPONSE))
        .mockResolvedValueOnce(ok(TRAILS_RESPONSE))
        .mockResolvedValueOnce(ok(AMENITIES_RESPONSE));
    }
    const twoAreas = { areas: [{ name: "A", bbox: BBOX }, { name: "B", bbox: BBOX }], exclude: [] };

    const counts = await runFetch({ config: twoAreas, outDir, fetchImpl });

    expect(counts).toEqual({ parks: 1, trails: 1, amenities: 1 });
  });

  test("passes an area's boundary into its Overpass queries", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(ok(PARKS_RESPONSE))
      .mockResolvedValueOnce(ok(TRAILS_RESPONSE))
      .mockResolvedValueOnce(ok(AMENITIES_RESPONSE));
    const bounded = { areas: [{ name: "City", bbox: BBOX, boundary: "relation/162378" }], exclude: [] };

    await runFetch({ config: bounded, outDir, fetchImpl });

    for (const [, init] of fetchImpl.mock.calls) {
      expect(new URLSearchParams(init.body).get("data")).toContain("rel(162378);map_to_area->.boundary;");
    }
  });
});
