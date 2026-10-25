import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.use("/api", authRoutes);
app.use("/api", serviceRoutes);
app.use("/api", bookingRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  const badInput = err.name === "ValidationError" || err.name === "CastError"; // CastError: invalid id
  res.status(badInput ? 400 : 500).json({ message: err.message });
});

await connectDB();
app.listen(process.env.PORT, () => console.log("Server on port " + process.env.PORT));
