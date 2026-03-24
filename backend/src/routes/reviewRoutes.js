import express from "express"
import {getAllReviewsPark, getReviewById, addReviewPark, updateReview, deleteReview, getAllReviewsUser} from "../controllers/reviewController.js"
import { validateReview } from "../middleware/review.js"
import passport from "../config/passport.js"

const router = express.Router()


router.route("/user") //I forgot what this does, too scared to touch it
    .get(getAllReviewsPark)

router.route("/userreviews")
    .get(passport.authenticate("jwt", {session: false}), getAllReviewsUser)

router.route("/edit/:id")
    .get(getReviewById)
    .put(validateReview, updateReview)
    .delete(deleteReview)

router.route("/:parkId")
    .get(getAllReviewsPark)
    .post(passport.authenticate("jwt", {session: false}), validateReview, addReviewPark)

export default router