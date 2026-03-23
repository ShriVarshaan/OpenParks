import prisma from "../config/prisma.js"
const nodemailer = require('nodemailer');
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
dotenv.config()

export const sendVerificiaiton = async(req,res,recipient) =>{
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
    used = true
    while(used == true){
    randomString = crypto.randomBytes(4).toString('hex')
    used = checkIfPasswordUsed(req,res,randomString)
    }

    const newOTP = await prisma.OneTimePassword.create({
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

const checkIfPasswordUsed = async(req,res,recipient,oneTimePassword) =>{
    try{
        used = prisma.OTP.findUnique({where: {value: oneTimePassword}})
        if(used){
            return true
        }
        validation = prisma.OTP.findUnique({where: {email: recipient, active: true}})
        if(validation){
            validation.active = false
        }
        return false
    }
    catch(err){
        return res.status(401).json({message: "Invalid credentials"})
    }
}