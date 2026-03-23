import express from "express"
import {getAllReviewsPark, getReviewById, addReviewPark, updateReview, deleteReview} from "../controllers/reviewController.js"
import { validateReview } from "../middleware/review.js"
import passport from "../config/passport.js"

const router = express.Router()

//get all reviews given park id
//put a new review given a park id

router.route("/user")
    .get(getAllReviewsPark)

router.route("/edit/:id")
    .get(getReviewById)
    .put(validateReview, updateReview)
    .delete(deleteReview)

router.route("/:parkId")
    .get(getAllReviewsPark)
    .post(passport.authenticate("jwt", {session: false}), validateReview, addReviewPark)

export default router