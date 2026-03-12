import Joi from "joi"

export const userCreationJoi = Joi.object({
    username: Joi.string().alphanum().min(3).max(16).required(),
    email: Joi.string().email({tlds: {allow: false}}).required(),
    password: Joi.string().alphanum().min(3).max(18).required()
})

export const userLoginJoi = Joi.object({
    email: Joi.string().email({tlds: {allow: false}}).required(),
    password: Joi.string().alphanum().min(3).max(18).required()
})