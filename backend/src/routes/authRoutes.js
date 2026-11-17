import express from "express"
import {login, signup} from "../controllers/authController.js"
import { validateUser, validateUserLogin } from "../middleware/user.js"
import { checkValidOTP, resendOtp } from "../controllers/validateEmail.js"
import { authLimiter, otpLimiter } from "../middleware/rateLimit.js"

const router = express.Router()

router.route("/login")
    .post(authLimiter, validateUserLogin, login)

router.route("/signup")
    .post(authLimiter, validateUser, signup)

router.post("/verify-otp", otpLimiter, checkValidOTP)

router.post("/resend-otp", otpLimiter, resendOtp)

export default router
