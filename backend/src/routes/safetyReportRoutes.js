import express from "express"
import { getAllReports, createNewReport, updateReport } from "../controllers/safetyReport.js";
import { validateReport } from "../middleware/safetyReport.js";
import passport from "../config/passport.js"

const router = express.Router()

router.route(":id")
    .get(getAllReports)
    .post(passport.authenticate("jwt", {session: false}), validateReport, createNewReport)

router.route(":id/:reportid")
    .patch(passport.authenticate("jwt", {session: false}), updateReport)

export default router