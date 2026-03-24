import express from "express"
import { getAllReports, createNewReport, updateReport, getAllReportsHeatmap, getUserReports } from "../controllers/safetyReport.js";
import { validateReport } from "../middleware/safetyReport.js";
import passport from "../config/passport.js"

const router = express.Router()

router.route("/")
    .get(getAllReportsHeatmap)
    .post(passport.authenticate("jwt", {session: false}), createNewReport)

router.route("/userreports")
    .get(passport.authenticate("jwt", {session: false}), getUserReports) //add passport jwt here

router.route("/:reportname")
    .get(getAllReports)

router.route("/:reportid/resolve")
    .patch(passport.authenticate("jwt", {session: false}), updateReport)

export default router