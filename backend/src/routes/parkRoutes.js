import express from "express";
import {
    getAllParks,
    getParkById,
    createPark,
    updatePark,
    deletePark,
    getNearbyParks
} from "../controllers/parkController.js";

const router = express.Router();

router.route("/").get(getAllParks);
router.get("/:id", getParkById);
router.post("/", createPark);
router.put("/:id", updatePark);
router.delete("/:id", deletePark);
router.get("/nearby", getNearbyParks);

export default router;