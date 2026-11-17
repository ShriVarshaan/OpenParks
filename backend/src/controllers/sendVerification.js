import "../config/loadEnv.js"
import prisma from "../config/prisma.js"
import nodemailer from 'nodemailer';
import crypto from "crypto"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { buildTransportOptions } from "../config/env.js"

// Minimum gap between codes sent to one address, so the endpoints that send codes
// can't be used to flood someone's inbox.
export const OTP_COOLDOWN_SECONDS = 60

// Returns true if a code was emailed, false if one was sent to this address
// within the cooldown (nothing is sent then).
export const sendVerification = async(recipient) =>{
    const recent = await prisma.oneTimePasswords.findFirst({
        where: {
            email: recipient,
            created_at: { gt: new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000) },
        },
    })
    if (recent) {
        return false
    }

    const transporter = nodemailer.createTransport(buildTransportOptions());

    try {
        await transporter.verify()

        const now = new Date();
        let used = true
        let randomString
        while(used == true){
        randomString = crypto.randomBytes(4).toString('hex')
        used = await checkIfPasswordUsed(recipient, randomString)
        }

        const newOTP = await prisma.oneTimePasswords.create({
        data: {
            created_at: now,
            value: randomString,
            active: true,
            email: recipient,

        }
        })

        const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: recipient,
        subject: "One Time Password Verification",
        text: randomString,
        };

        await transporter.sendMail(mailOptions);
        return true
    } catch (err){
        throw err
    }
}

const checkIfPasswordUsed = async(recipient, oneTimePassword) =>{
    try{
        const used = await prisma.oneTimePasswords.findFirst({where: {value: oneTimePassword}})
        if(used){
            return true
        }
        const validation = await prisma.oneTimePasswords.findFirst({where: {email: recipient, active: true}})
        if(validation){
            await prisma.oneTimePasswords.update({
                where: { id: validation.id },
                data: { active: false }
            })
        }
        return false
    }
    catch(err){
        throw err
    }
}