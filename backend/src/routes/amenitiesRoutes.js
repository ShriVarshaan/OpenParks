import express from "express"
import { getAmenities } from "../controllers/amenityController.js"
import {getAllAmenities} from "../controllers/amenityController.js"

const router = express.Router()

router.route("/")
    .get(getAllAmenities)

router.route("/:id")
    .get(getAmenities)
    
export default router