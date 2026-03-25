import prisma from "../config/prisma.js";


const trailRowToFeature = (row) => ({
    type: "Feature",
    geometry: row.geometry,
    properties: {
        id: row.id,
        park_id: row.park_id,
        osm_id: row.osm_id ? row.osm_id.toString() : null,
        highway: row.highway,
        name: row.name,
        surface: row.surface,
    }
});

export const getTrailsByParkId = async (req, res) => {
    const { parkId } = req.params;
    try {
        const result = await prisma.$queryRaw`
            SELECT
                id,
                park_id,
                osm_id,
                highway,
                name,
                surface,
                ST_AsGeoJSON(geom)::json AS geometry
            FROM public."trails"
            WHERE park_id = ${Number(parkId)}
        `;
        const features = result.map(trailRowToFeature);
        return res.status(200).json({ type: "FeatureCollection", features });
    } catch (err) {
        return res.status(500).json({ error: "Failed to fetch trails" });
    }
};

export const getAllTrails = async (req, res) => {
    try {
        const result = await prisma.$queryRaw`
            SELECT
                id,
                park_id,
                osm_id,
                highway,
                name,
                surface,
                ST_AsGeoJSON(geom)::json AS geometry
            FROM public."trails"
            ORDER BY id
        `;
        const features = result.map(trailRowToFeature);
        return res.status(200).json({ type: "FeatureCollection", features });
    } catch (err) {
        return res.status(500).json({ error: "Failed to fetch trails" });
    }
};