import prisma from "../config/prisma.js"


export const getAllReports = async (req, res) => {
    try{
        const reports = await prisma.safetyReport.findMany({
            where: { park_id: req.params.id },
        })
        res.status(200).json(reports)
    } catch (err){
        console.log(err)
    }
}

export const createNewReport = async (req, res) => {
    try{
        const userId = Number(req.user.id)
        const parkId = Number(req.params.id ?? req.body.parkId)
        const park = await prisma.$queryRaw`
            SELECT id
            FROM public."Park"
            WHERE id = ${parkId}
            LIMIT 1
        `
        if (!park || park.length === 0) {
            return res.status(404).json({ error: "Park not found" })
        }


        const report = await prisma.$executeRaw`
            INSERT INTO public."SafetyReport" (
                user_id,
                park_id,
                description, 
                heading
            )VALUES(
                ${Number(userId)},
                ${Number(req.body.park_id ?? parkId)},
                ${req.body.description},
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

        const updatedReport = await prisma.safetyReport.update({
            where: {id: Number(req.params.reportid)},
            data:{status: req.body.status},
        })
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
