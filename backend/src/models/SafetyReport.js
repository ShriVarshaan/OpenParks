import Joi from "joi"

export const safetyReportJoi = Joi.object({
    description: Joi.string().required()
})