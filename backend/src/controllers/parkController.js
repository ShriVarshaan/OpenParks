import prisma from "../config/prisma.js";

const rowToFeature = (row) => ({
    type: "Feature",
    geometry: row.geometry,
    properties: {
        id: row.id,
        name: row.name,
        terrain_data: row.terrain_data,
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
        res.status(200).json({ type: "FeatureCollection", features });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch parks" });
    }
};

export const getParkById = async (req, res) => {
    const { id } = req.params;
    try {
        const [park] = await prisma.$queryRaw`
            SELECT 
                id,
                name,
                terrain_data,
                mobility_data,
                maintenance_stats,
                json_build_object(
                    'type', 'Point',
                    'coordinates', json_build_array(longitude, latitude)
                ) AS geometry
            FROM public."Park"
            WHERE id = ${parseInt(id)}
        `;
        if (!park) {
            return res.status(404).json({ error: "Park not found" });
        }
        res.status(200).json(rowToFeature(park));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch park" });
    }
};
