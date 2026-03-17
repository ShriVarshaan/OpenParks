import express from "express"
import { getAllTrails, getTrailsByParkId } from "../controllers/trailController.js"

const router = express.Router()

router.route("/")
    .get(getAllTrails)

router.route("/:parkId")
    .get(getTrailsByParkId)

export default router