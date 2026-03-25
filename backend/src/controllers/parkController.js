import prisma from "../config/prisma.js";

const rowToFeature = (row) => ({
    type: "Feature",
    geometry: row.geometry,
    properties: {
        id: row.id,
        name: row.name,
        mobility_data: row.mobility_data,
        maintenance_stats: row.maintenance_stats,
        ...(row.distance && { distance: row.distance })
    }
});

export const getAllParks = async (req, res) => {
    try {
        const result = await prisma.$queryRaw`
            SELECT 
                id, name, ST_AsGeoJSON(location)::json AS geometry
            FROM public."Park"
            ORDER BY id
        `;
        const features = result.map(rowToFeature);
        return res.status(200).json({ type: "FeatureCollection", features });
    } catch (err) {
        return res.status(500).json({ error: "Failed to fetch parks" });
    }
};

export const getParkById = async (req, res) => {
    const { id } = req.params;
    try {
        const [park] = await prisma.$queryRaw`
            SELECT 
                id,
                name,
                mobility_data,
                maintenance_stats,
                ST_AsGeoJSON(location)::json AS geometry
            FROM public."Park"
            WHERE id = ${Number(id)}
        `;
        if (!park) {
            return res.status(404).json({ error: "Park not found" });
        }
        return res.status(200).json(rowToFeature(park));
    } catch (err) {
        return res.status(500).json({ error: "Failed to fetch park" });
    }
};
