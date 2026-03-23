import prisma from "../config/prisma.js"


export const getAllReports = async (req, res) => {
    try{
        const reports = await prisma.$queryRaw`
            SELECT 
                id, 
                user_id, 
                description, 
                image, 
                status, 
                created_at, 
                heading,
                ST_AsGeoJSON(location)::json as location
            FROM "SafetyReport"
            WHERE heading = ${req.params.reportname} AND status='OPEN';
        `
        res.status(200).json(reports)
    } catch (err){
        console.log(err)
    }
}

export const createNewReport = async (req, res) => {
    try{
        const userId = Number(req.user.id)

        const [lng, lat] = req.body.location.coordinates

        const report = await prisma.$executeRaw`
            INSERT INTO public."SafetyReport" (
                user_id,
                park_id,
                description, 
                location,
                heading
            )VALUES(
                ${Number(userId)},
                ${Number(req.body.parkId)},
                ${req.body.description},
                ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4236),
                ${req.body.heading}
            )
            RETURNING *
            `;

        return res.status(201).json(report[0])
    } catch (err){
        console.log(err)
        return res.status(500).json({ error: "Internal server error" })
    }
}

export const updateReport = async (req, res) => {
    try{
        const report = await prisma.safetyReport.findUnique({where: {id: Number(req.params.reportid)}})

        if (!report){
            return res.status(404).json({message: "report not found"})
        }

        const updatedReport = await prisma.safetyReport.update({where: {id: Number(req.params.reportid)}, data:{status: "RESOLVED"}})
        res.status(200).json(updatedReport)
    } catch (err) {
        if (err.code && err.code === "P2002"){
            res.status(400).json({error: "Invalid error code"})
        } else{
            res.status(500).json({error: "Server error"})
        }
    }
}
export const getAllReportsHeatmap = async (req, res) => {
    try{
        const reports = await prisma.$queryRaw`
            SELECT 
                id,
                heading,
                ST_AsGeoJSON(location)::json as location
            FROM "SafetyReport"
            WHERE status='OPEN';
        `
        res.status(200).json(reports)
    } catch (err){
        console.log(err)
        res.status(500).json({error: "Server error"})
    }
}
