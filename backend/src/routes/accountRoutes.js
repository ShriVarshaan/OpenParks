import express from "express"
import { getUser, deleteUser } from "../controllers/accountController.js"
import passport from "../config/passport.js"

const router = express.Router()

router.route("/")
    .get(passport.authenticate("jwt", {session: false}), getUser)

router.route("/delete")
    .delete(passport.authenticate("jwt", {session: false}), deleteUser)
export default router