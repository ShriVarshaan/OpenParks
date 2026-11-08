import "../config/loadEnv.js"
import prisma from "../config/prisma.js"
import nodemailer from 'nodemailer';
import crypto from "crypto"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { buildTransportOptions } from "../config/env.js"

export const sendVerification = async(recipient) =>{
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

        const info = await transporter.sendMail(mailOptions);
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