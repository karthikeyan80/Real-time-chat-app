import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import authRoutes from "./routes/AuthRoutes.js";
import contactsRoutes from "./routes/ContactRoutes.js";
import messagesRoutes from "./routes/MessagesRoute.js";
import setupSocket from "./socket.js";
import channelRoutes from "./routes/ChannelRoutes.js";
import ttsRoutes from "./routes/tts.js";
import path from "path";

dotenv.config();

const app = express();
const port = process.env.PORT || 8747;
const databaseURL = process.env.DATABASE_URL;

app.use(
  cors({
    origin: process.env.ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/uploads/profiles", express.static("uploads/profiles"));
app.use("/uploads/files", express.static("uploads/files"));
app.use("/uploads/audio", express.static("uploads/audio"));

app.use(cookieParser());
app.use(express.json());



// Add root route here BEFORE starting the server
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Create HTTP server
const server = app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

// Initialize socket.io
const io = setupSocket(server);

// Make io instance available to the entire app
app.set("io", io);

app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/channel", channelRoutes);
app.use("/api/tts", ttsRoutes);

mongoose
  .connect(databaseURL)
  .then(() => {
    console.log("DB Connection Successful");
  })
  .catch((err) => {
    console.log(err.message);
  });
