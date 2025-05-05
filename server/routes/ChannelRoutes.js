import { Router } from "express";
import {
  createChannel,
  getChannelMessages,
  getUserChannels,
  addMembersToChannel,
  leaveChannel,
  disbandChannel,
} from "../controllers/ChannelControllers.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";

const channelRoutes = Router();

channelRoutes.post("/create-channel", verifyToken, createChannel);
channelRoutes.get("/get-user-channels", verifyToken, getUserChannels);
channelRoutes.get(
  "/get-channel-messages/:channelId",
  verifyToken,
  getChannelMessages
);
channelRoutes.post("/add-members", verifyToken, addMembersToChannel);
channelRoutes.delete("/leave/:channelId", verifyToken, leaveChannel);
channelRoutes.delete("/disband/:channelId", verifyToken, disbandChannel);

export default channelRoutes;
