import { reviewSchemaJoi } from "../models/Review.js"

export const validateReview = async (req, res, next) => {
    const {error} = reviewSchemaJoi.validate(req.body, {abortEarly: false})

    if (error){
        const errorMessages = error.details.map((detail) => detail.message);
        return res.status(400).json({error: errorMessages})
    }

    next()
}