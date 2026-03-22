import { userCreationJoi, userLoginJoi } from "../models/User.js"

export const validateUser = async (req, res, next) => {
    const {error} = userCreationJoi.validate(req.body, {abortEarly: false})

    if (error){
        const errorMessages = error.details.map((detail) => detail.message);
        console.log(errorMessages)
        return res.status(400).json({error: errorMessages})
    }

    next()
}

export const validateUserLogin = async (req, res, next) => {
    const {error} = userLoginJoi.validate(req.body, {abortEarly: false})

    if (error){
        const errorMessages = error.details.map((detail) => detail.message);
        return res.status(400).json({error: errorMessages})
    }

    next()
}