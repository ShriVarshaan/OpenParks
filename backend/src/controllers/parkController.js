import prisma from "../config/prisma.js"

const rowToFeature = (row) => ({
  type: 'Feature',
  geometry: row.geometry,
  properties: {
    id: row.id,
    name: row.name,
    category: row.category,
    address: row.address,
    created_at: row.created_at,
    ...(row.distance && { distance: row.distance })
  }
});


export const getAllParks = async (req, res, next) => {
    try {
    const result = await prisma.$queryRaw`
      SELECT 
        id, name, ST_AsGeoJSON(location)::json AS geometry
      FROM public."Park"
      ORDER BY id
    `;
    const features = result.map(rowToFeature);
    res.status(200).json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
}