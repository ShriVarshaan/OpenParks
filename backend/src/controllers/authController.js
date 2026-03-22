import prisma from "../config/prisma.js"
const nodemailer = require('nodemailer');
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import { sendVerificiaiton } from "./sendVerification.js";
dotenv.config()

export const signup = async (req, res, next) =>{
    try{
        console.log(req.body)
        const user = await prisma.user.findUnique({where: {email: req.body.email}})
        if (user){
            return res.status(409).json({message: "User exists already"})
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const newUser = await prisma.user.create({
            data: {
                email: req.body.email,
                password: hashedPassword,
                username: req.body.username
            }
        })
        
        sendVerificiaiton(req,res,req.body.email)
        
        
        const token = jwt.sign(
            {id: newUser.id},
            process.env.JWT_SECRET,
            {expiresIn: "7d"}
        )

        return res.status(201).json({
            message: "created successfully",
            token: token,
            user: { id: newUser.id, email: newUser.email }
        })
    } catch (err){
        console.log(err)
        return res.status(500).json({message: "Sign up unsuccessful"})
    }
}

export const login = async(req, res, next) => {
    try{
        const user = await prisma.user.findUnique({where: {email: req.body.email}})
        if(!user){
            return res.status(401).json({message: "Invalid credentials"})
        }

        const match = await bcrypt.compare(req.body.password, user.password)

        if(!match){
            return res.status(401).json({message: "Invalid credentials"})
        }

        const token = jwt.sign(
            {id: user.id},
            process.env.JWT_SECRET,
            {expiresIn: "7d"}
        )

        return res.status(200).json({
        message: "logged in",
        token: token,
        user: { id: user.id, email: user.email }
    })
    } catch (err){
        return res.status(401).json({message: "Invalid credentials"})
    }
}

const checkIfPasswordUsed = async(req,res,oneTimePassword) =>{
    try{
        used = prisma.OTP.findUnique({where: {value: oneTimePassword}})
        if(used){
            return true
        }
        validation = prisma.OTP.findUnique({where: {email: req.body.email, active: true}})
        if(validation){
            validation.active = false
        }
        return false
    }
    catch(err){
        return res.status(401).json({message: "Invalid credentials"})
    }
}