import express from "express"
import dotenv from "dotenv"
import parkRoutes from "./routes/parkRoutes.js"
import authRoutes from "./routes/authRoutes.js"
import cors from "cors"
import "./config/passport.js"
import "./config/prisma.js"

dotenv.config();
const app = express();

if (process.env.NODE_ENV !== "production") {
    app.use(cors({
        origin: "http://localhost:5173",
        credentials: true
    }));
}

app.use("/api/parks", parkRoutes)
app.use("/api/auth", authRoutes)


app.listen(3000, () => {
    console.log("Listening")
})