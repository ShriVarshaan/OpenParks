/*connected to a html object of an entry box to enter the one time password
takes input and checks to see if that is what is stored in the database
If so, it then maeks the account which is attached to that email be verified
*/

import prisma from "../config/prisma.js"
import nodemailer from "nodemailer"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import { sendVerification } from "./sendVerification.js";
dotenv.config()

export const checkValidOTP = async(req,res) =>{
    try{
        const OTP = await prisma.oneTimePasswords.findFirst({where: {email: req.body.email, active: true}})
        if(!OTP){
            sendVerification(req,res,req.body.email)
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
        console.log(error)
        return res.status(401).json({message: "Invalid Password"})
    }   
}