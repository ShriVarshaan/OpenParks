import Joi from "joi"

export const userCreationJoi = Joi.object({
    username: Joi.String().alphanum().min(3).max(16).required(),
    email: Joi.Sring().email({tlds: {allow: false}}).required(),
    password: Joi.String().alphanum().min(3).max(18).required()
})

export const userLoginJoi = Joi.object({
    email: Joi.Sring().email({tlds: {allow: false}}).required(),
    password: Joi.String().alphanum().min(3).max(18).required()
})