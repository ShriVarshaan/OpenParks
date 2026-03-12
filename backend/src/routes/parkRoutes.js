import express from "express";
import { getAllParks, getParkById} from "../controllers/parkController.js";

const router = express.Router();

router.route("/")
    .get(getAllParks);
router.route("/:id")
    .get(getParkById)

export default router;