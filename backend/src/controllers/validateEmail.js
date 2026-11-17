import "../config/loadEnv.js"
/*connected to a html object of an entry box to enter the one time password
takes input and checks to see if that is what is stored in the database
If so, it then maeks the account which is attached to that email be verified
*/

import prisma from "../config/prisma.js"
import nodemailer from "nodemailer"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { sendVerification } from "./sendVerification.js";

const COOLDOWN_MESSAGE = {message: "Please wait a minute before requesting another code"}

const needsVerification = async (email) => {
    const user = await prisma.user.findUnique({where: {email}})
    return Boolean(user && !user.Verified)
}

// Same answer whether or not the address has an account, so this can't be used
// to find out who has signed up.
export const resendOtp = async (req, res) => {
    const email = req.body?.email
    if (typeof email !== "string" || email.trim() === "") {
        return res.status(400).json({message: "Email is required"})
    }
    try {
        if (await needsVerification(email)) {
            const sent = await sendVerification(email)
            if (!sent) {
                return res.status(429).json(COOLDOWN_MESSAGE)
            }
        }
        return res.status(200).json({message: "If that account needs verifying, a new code has been sent"})
    } catch (err) {
        return res.status(500).json({message: "Failed to send OTP"})
    }
}

export const checkValidOTP = async(req,res) =>{
    try{
        const OTP = await prisma.oneTimePasswords.findFirst({where: {email: req.body.email, active: true}})
        if(!OTP){
            // Only accounts still awaiting verification get a new code, so this
            // endpoint can't be used to email arbitrary addresses.
            if (!(await needsVerification(req.body.email))) {
                return res.status(401).json({message: "Invalid One Time Password"})
            }
            // Awaited: an un-awaited rejection here (e.g. SMTP down) used to crash the server.
            let sent
            try {
                sent = await sendVerification(req.body.email)
            } catch (err) {
                return res.status(500).json({message: "Could not send a new OTP, try again later"})
            }
            if (!sent) {
                return res.status(429).json(COOLDOWN_MESSAGE)
            }
            return res.status(401).json({message: "No active OTP, new OTP sent"})
        }
        const now = new Date();
        const diffMinutes = (now-OTP.created_at)/(1000*60)
        if((OTP.value != req.body.otp)||(diffMinutes>5)){
            if(diffMinutes>5){
                const updateOTP = await prisma.oneTimePasswords.update({
                    where: {id: OTP.id, email: req.body.email, active: true},
                    data: {active: false}
                })
            }
            return res.status(401).json({message: "Invalid One Time Password"})
        }

        const updateUser = await prisma.user.update({
            where: { email: req.body.email },
            data: { Verified: true },
          });
        
        await prisma.oneTimePasswords.update({
            where: { id: OTP.id },
            data: { active: false }
        })

        const token = jwt.sign(
            {id: updateUser.id},
            process.env.JWT_SECRET,
            {expiresIn: "7d"}
        )

        return res.status(201).json({
            message: "Account Verified",
            token: token,
            user: { id: updateUser.id, email: updateUser.email }
        })
    }
    catch(error){
        return res.status(401).json({message: "Invalid Password"})
    }   
}