import express from "express"
import { getAllParks } from "../controllers/parkController.js"

const router = express.Router()

router.route("/")
    .get(getAllParks)

export default router