import prisma from "../config/prisma.js"

export const getAmenities = async (req, res) => {
    try{
        const amenities = await prisma.parkAmenity.findMany({where: {park_id: Number(req.params.id)}})
        return res.status(200).json(amenities)
    } catch (err) {
        console.log(err)
    }
}