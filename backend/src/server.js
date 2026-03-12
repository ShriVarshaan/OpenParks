import express from "express"
import prisma from "./config/prisma.js";


const app = express()

app.listen(3000, () => {
    console.log("Listening")
})