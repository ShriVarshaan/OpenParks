import express from "express"
import {login, signup} from "../controllers/authController.js"
import { validateUser, validateUserLogin } from "../middleware/user.js"
import { checkValidOTP } from "../controllers/validateEmail.js"
import { sendVerification } from "../controllers/sendVerification.js"

const router = express.Router()

router.route("/login")
    .post(validateUserLogin, login)

router.route("/signup")
    .post(validateUser, signup)

router.post("/verify-otp", checkValidOTP)

router.post("/resend-otp", async (req, res) => {
    try {
        await sendVerification(req.body.email);
        return res.status(200).json({ message: "OTP sent" });
    } catch (err) {
        return res.status(500).json({ message: "Failed to send OTP" });
    }
});

export default router