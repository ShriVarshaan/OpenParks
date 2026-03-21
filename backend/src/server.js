import express from "express"
import dotenv from "dotenv"
import parkRoutes from "./routes/parkRoutes.js"
import authRoutes from "./routes/authRoutes.js"
import amenityRoutes from "./routes/amenitiesRoutes.js"
import safetyRoutes from "./routes/safetyReportRoutes.js"
import reviewRoutes from "./routes/reviewRoutes.js"
import trailRoutes from "./routes/trailRoutes.js"
import cors from "cors"
import emailRoutes from "./routes/emailRoutes.js"
import "./config/passport.js"
import "./config/prisma.js"

dotenv.config();
const app = express();

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))

app.use(express.json())

app.use("/api/parks", parkRoutes)
app.use("/api/auth", authRoutes)
app.use("/api/amenities", amenityRoutes)
app.use("/api/safetyreport", safetyRoutes)
app.use("/api/reviews", reviewRoutes)
app.use("/api/trails", trailRoutes)
app.use('/api/email', emailRoutes);


app.listen(3000, () => {
    console.log("Listening")
})