import express from "express"

const router = express.Router()

//get all reviews given park id
//put a new review given a park id
router.route("/:parkId")
    .get(getAllReviewsPark)

export default router