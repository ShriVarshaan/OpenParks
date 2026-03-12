import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import parkRoutes from "./routes/parkRoutes.js";

dotenv.config();
const app = express();

if (process.env.NODE_ENV !== "production") {
    app.use(cors({
        origin: "http://localhost:5173",
        credentials: true
    }));
}

app.use(express.json());
app.use("/api/parks", parkRoutes);

app.get("/", (req, res) => {
    res.send("Server is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});