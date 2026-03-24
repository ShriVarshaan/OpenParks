import Joi from "joi"

export const reviewSchemaJoi = Joi.object({
    content: Joi.string().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().allow("").optional(),
    park_id: Joi.number().optional(),
    latitude: Joi.number().optional(),
    longitude: Joi.number().optional()
})