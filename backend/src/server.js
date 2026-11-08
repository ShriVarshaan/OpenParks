import express from "express"
import dotenv from "dotenv"
import parkRoutes from "./routes/parkRoutes.js"
import authRoutes from "./routes/authRoutes.js"
import amenityRoutes from "./routes/amenitiesRoutes.js"
import safetyRoutes from "./routes/safetyReportRoutes.js"
import reviewRoutes from "./routes/reviewRoutes.js"
import trailRoutes from "./routes/trailRoutes.js"
import userRoutes from "./routes/accountRoutes.js"
import cors from "cors"
//import emailRoutes from "./routes/emailRoutes.js"
import "./config/passport.js"
import "./config/prisma.js"
import { parseCorsOrigins } from "./config/env.js"

dotenv.config();
const app = express();
const PORT = Number(process.env.PORT) || 3000

app.use(cors({
    origin: parseCorsOrigins(process.env.CORS_ORIGINS),
    credentials: true
}))

app.use(express.json())

app.use("/api/parks", parkRoutes)
app.use("/api/auth", authRoutes)
app.use("/api/amenities", amenityRoutes)
app.use("/api/safetyreport", safetyRoutes)
app.use("/api/reviews", reviewRoutes)
app.use("/api/trails", trailRoutes)
app.use("/api/user", userRoutes)
//app.use('/api/email', emailRoutes);


app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})