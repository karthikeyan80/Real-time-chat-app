import { Router } from "express";
import {
  getMessages,
  uploadFile,
  deleteChat,
} from "../controllers/MessagesController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import multer from "multer";

const messagesRoutes = Router();
const upload = multer({ dest: "uploads/files/" });
messagesRoutes.post("/get-messages", verifyToken, getMessages);
messagesRoutes.post(
  "/upload-file",
  verifyToken,
  upload.single("file"),
  uploadFile
);
messagesRoutes.delete("/delete-chat", verifyToken, deleteChat);

export default messagesRoutes;
