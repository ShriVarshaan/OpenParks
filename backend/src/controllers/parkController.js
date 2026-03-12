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

export const createPark = async (req, res) => {
    const { name, terrain_data, mobility_data, latitude, longitude, maintenance_stats } = req.body;
    if (!name || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: "Missing required fields: name, latitude, longitude" });
    }
    try {
        const [newPark] = await prisma.$queryRaw`
            INSERT INTO public."Park" (name, terrain_data, mobility_data, latitude, longitude, maintenance_stats)
            VALUES (${name}, ${terrain_data}, ${mobility_data}, ${latitude}, ${longitude}, ${maintenance_stats})
            RETURNING id
        `;
        res.status(201).json({ id: newPark.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create park" });
    }
};

export const updatePark = async (req, res) => {
    const { id } = req.params;
    const { name, terrain_data, mobility_data, latitude, longitude, maintenance_stats } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
    }
    if (terrain_data !== undefined) {
        updates.push(`terrain_data = $${paramIndex++}`);
        values.push(terrain_data);
    }
    if (mobility_data !== undefined) {
        updates.push(`mobility_data = $${paramIndex++}`);
        values.push(mobility_data);
    }
    if (latitude !== undefined) {
        updates.push(`latitude = $${paramIndex++}`);
        values.push(latitude);
    }
    if (longitude !== undefined) {
        updates.push(`longitude = $${paramIndex++}`);
        values.push(longitude);
    }
    if (maintenance_stats !== undefined) {
        updates.push(`maintenance_stats = $${paramIndex++}`);
        values.push(maintenance_stats);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
    }

    values.push(parseInt(id));
    const query = `
        UPDATE public."Park"
        SET ${updates.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING id
    `;

    try {
        const [updated] = await prisma.$queryRawUnsafe(query, ...values);
        if (!updated) {
            return res.status(404).json({ error: "Park not found" });
        }
        res.status(200).json({ id: updated.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update park" });
    }
};

export const deletePark = async (req, res) => {
    const { id } = req.params;
    try {
        const [deleted] = await prisma.$queryRaw`
            DELETE FROM public."Park"
            WHERE id = ${parseInt(id)}
            RETURNING id
        `;
        if (!deleted) {
            return res.status(404).json({ error: "Park not found" });
        }
        res.status(200).json({ message: "Park deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete park" });
    }
};

export const getNearbyParks = async (req, res) => {
    const { lat, lng, radius = 1000 } = req.query;
    if (!lat || !lng) {
        return res.status(400).json({ error: "Missing coordinates: lat and lng are required" });
    }

    const earthRadius = 6371000;

    try {
        const parks = await prisma.$queryRaw`
            SELECT 
                id,
                name,
                terrain_data,
                mobility_data,
                maintenance_stats,
                json_build_object(
                    'type', 'Point',
                    'coordinates', json_build_array(longitude, latitude)
                ) AS geometry,
                (
                    ${earthRadius} * acos(
                        cos(radians(${parseFloat(lat)})) * cos(radians(latitude)) *
                        cos(radians(longitude) - radians(${parseFloat(lng)})) +
                        sin(radians(${parseFloat(lat)})) * sin(radians(latitude))
                    )
                ) AS distance
            FROM public."Park"
            WHERE
                latitude BETWEEN ${parseFloat(lat) - (radius / earthRadius) * (180 / Math.PI)}
                             AND ${parseFloat(lat) + (radius / earthRadius) * (180 / Math.PI)}
                AND longitude BETWEEN ${parseFloat(lng) - (radius / earthRadius) * (180 / Math.PI) / cos(radians(${parseFloat(lat)}))}
                                  AND ${parseFloat(lng) + (radius / earthRadius) * (180 / Math.PI) / cos(radians(${parseFloat(lat)}))}
            HAVING distance < ${parseFloat(radius)}
            ORDER BY distance
        `;
        const features = parks.map(rowToFeature);
        res.status(200).json({ type: "FeatureCollection", features });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to search nearby parks" });
    }
};

export const testConnection = async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ success: true, message: "Database connected" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database connection failed" });
    }
};