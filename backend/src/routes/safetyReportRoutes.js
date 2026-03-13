import express from "express"
import { getAllReports, createNewReport, updateReport } from "../controllers/safetyReport.js";
import { validateReport } from "../middleware/safetyReport.js";

const router = express.Router()

router.route(":id")
    .get(getAllReports)
    .post(validateReport, createNewReport)

router.route(":id/:reportid")
    .patch(updateReport)

export default router