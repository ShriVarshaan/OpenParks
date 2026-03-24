import prisma from "../config/prisma.js"

// For the parks details page
export const getAllReviewsPark = async (req, res, next) => {
    try{
        const reviews = await prisma.review.findMany({where: {park_id: Number(req.params.parkId)}})
        return res.status(200).json(reviews)
    }catch (err){
        console.log(err)
    }
}

export const addReviewPark = async (req, res, next) => {
    try{
        const park = await prisma.park.findUnique({where: {id: Number(req.params.parkId)}})
        if (!park) {
            return res.status(404).json({message: "Park not found"})
        }
        const review = await prisma.review.create({
            data: {
                user_id: Number(req.user.id),
                park_id: Number(req.params.parkId),
                content: req.body.content,
                rating: Number(req.body.rating)
            }})
        return res.status(201).json(review)
    } catch (err){
        console.log(err)
        return res.status(400).json(err)
    }
}

//For the users page
export const getAllReviewsUser = async (req, res) => {
    try{
        const reviews = await prisma.review.findMany({where: {user_id: Number(req.user.id)}, include: {park: {select: {name: true}}}})
        return res.status(200).json(reviews)
    } catch (err){
        console.log(err)
    }
}

export const getReviewById = async (req, res) => {
    try{
        const review = await prisma.review.findUnique({where: {id: Number(req.params.id)}})
        if (!review) {
            return res.status(404).json({message: "Unavailable"})
        }
        return res.status(200).json(review)
    } catch (err){
        console.log(err)
    }
}

export const updateReview = async (req, res) => {
    try{
        const review = await prisma.review.findUnique({where: {id: Number(req.params.id), user_id: Number(req.user.id)}})
        if (!review){
            return res.status(403).json({message: "unauthorized"})
        }
        const updatedReview = await prisma.review.update({where: {id: Number(req.params.id)}, data: req.body})
        return res.status(200).json({message: "Updated successfully"})
    } catch (err){
        console.log(err)
    }
}

export const deleteReview = async (req, res, next) => {
    try{
        const review = await prisma.review.findUnique({where: {id: Number(req.params.id), user_id: Number(req.user.id)}})
        if (!review){
            return res.status(403).json({message: "unauthorized"})
        }
        await prisma.review.delete({where: {id: Number(req.params.id)}})

        return res.status(204)
    } catch (err) {
        console.log(err)
    }
}