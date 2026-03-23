import prisma from "../config/prisma.js"
import nodemailer from 'nodemailer';
import crypto from "crypto"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
dotenv.config()

export const sendVerification = async(recipient) =>{
    const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for port 465, false for 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    });

    transporter.verify((error) => {
    if (error) console.error('Email transporter error:', error);
    else console.log('Email server is ready');
    });

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