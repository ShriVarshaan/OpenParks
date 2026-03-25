import prisma from "../config/prisma.js"

export const getAmenities = async (req, res) => {
    try{
        const amenities = await prisma.parkAmenity.findMany({where: {park_id: Number(req.params.id)}})
        return res.status(200).json(amenities)
    } catch (err) {
        return res.status(500).json({message: "Internal server error"})
    }
}

export const getAllAmenities = async (req, res) => {
    try{
        const amenities = await prisma.$queryRaw`
            SELECT 
                id,
                park_id,
                name,
                ST_X(location::geometry) AS lng,
                ST_Y(location::geometry) AS lat
            FROM "ParkAmenity"
        `

        const geojson = amenities.map(a => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [a.lng, a.lat]
            },
            properties: {
                id: a.id,
                park_id: a.park_id,
                name: a.name,
                amenity: a.amenity,
            }
        }))
        return res.status(200).json(geojson)
    } catch (err) {
        return res.status(500).json({message: "Internal server error"})
    }
}