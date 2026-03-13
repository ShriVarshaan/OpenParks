import express from "express"
import { getAllReports, createNewReport, updateReport } from "../controllers/safetyReport.js";

const router = express.Router()

router.route(":id")
    .get(getAllReports)
    .post(createNewReport)

router.route(":id/:reportid")
    .patch(updateReport)

export default router