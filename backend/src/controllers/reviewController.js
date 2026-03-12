import prisma from "../config/prisma"

export const getAllReviews = async (req, res, next) => {
    try{
        const reviews = await prisma.review.findMany({where: {park_id: req.params.parkId}})
    }catch (err){
        console.log(err)
    }
}