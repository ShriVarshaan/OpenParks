import { safetyReportJoi } from "../models/SafetyReport.js"

export const validateReport = async (req, res, next) => {
    const {error} = safetyReportJoi.validate(req.body, {abortEarly: false})

    if (error){
        const errorMessages = error.details.map((detail) => detail.message);
        return res.status(400).json({error: errorMessages})
    }

    next()
}