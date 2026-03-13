import prisma from "../config/prisma.js"

//All the reports given a park id
export const getAllReports = async (req, res) => {
    try{
        const reports = await prisma.safetyReport.findMany({where: {park_id: (req.params.id)}})
        res.status(200).json(reports)
    } catch (err){
        console.log(err)
    }
}

export const createNewReport = async (req, res) => {
    try{
        const userId = Number(req.user.id)
        const [park] = await prisma.$queryRaw`
            SELECT 
                id,
                name,
                terrain_data,
                mobility_data,
                maintenance_stats,
                ST_AsGeoJSON(location)::json AS geometry
            FROM public."Park"
            WHERE id = ${Number(req.params.id)}
        `;
        if (!park) {
            return res.status(404).json({ error: "Park not found" });
        }

        const report = await prisma.$executeRaw`
            INSERT INTO public."SafetyReport" (
                user_id, 
                park_id, 
                description, 
                location
            )VALUES(
                ${Number(userId)},
                ${Number(req.params.id)},
                ${req.body.description},
                ST_GeomFromGeoJSON(${park.geometry})
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
        const report = await prisma.safetyReport.findUnique({where: {park_id: Number(req.params.id)}})

        if (!report){
            return res.status(404).json({message: "report not found"})
        }

        const updatedReport = await prisma.safetyReport.update({where: {id: Number(req.params.reportid)}, data:{status: req.body.status}})
        res.status(200).json(updatedReport)
    } catch (err) {
        if (err.code && err.code === "P2002"){
            res.status(400).json({error: "Invalid error code"})
        } else{
            res.status(500).json({error: "Server error"})
        }
    }
}