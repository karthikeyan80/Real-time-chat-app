import Message from "../model/MessagesModel.js";
import { mkdirSync, renameSync } from "fs";
import path from "path";

export const getMessages = async (req, res, next) => {
  try {
    const user1 = req.userId;
    const user2 = req.body.id;
    if (!user1 || !user2) {
      return res.status(400).send("Both user IDs are required.");
    }

    const messages = await Message.find({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 },
      ],
    })
      .sort({ timestamp: 1 })
      .populate("sender", "firstName lastName image color") // Populate sender details
      .select(
        "content sender recipient messageType fileUrl audioUrl voiceName timestamp"
      );

    return res.status(200).json({ messages });
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
};

export const uploadFile = async (request, response, next) => {
  try {
    if (request.file) {
      const date = Date.now();
      const fileDir = path.join("uploads", "files", `${date}`);
      const fileName = path.join(fileDir, request.file.originalname);

      // Create directory if it doesn't exist
      mkdirSync(fileDir, { recursive: true });

      // Move the uploaded file to the correct directory
      renameSync(request.file.path, fileName);

      return response.status(200).json({ filePath: fileName });
    } else {
      return response.status(404).send("File is required.");
    }
  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal Server Error.");
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { sender, recipient, content, messageType, ttsEnabled, voiceName } =
      req.body;

    const newMessage = new Message({
      sender,
      recipient,
      content,
      messageType,
      ttsEnabled,
      voiceName, // Store the selected voice name
      timestamp: new Date(),
    });

    await newMessage.save();

    return res.status(200).json({ message: newMessage });
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
};

export const deleteChat = async (req, res, next) => {
  try {
    const user1 = req.userId;
    const user2 = req.body.id;

    if (!user1 || !user2) {
      return res.status(400).json({
        success: false,
        message: "Both user IDs are required.",
      });
    }

    // Delete all messages between the two users
    const result = await Message.deleteMany({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 },
      ],
    });

    // Get the socket.io instance
    const io = req.app.get("io");

    // Prepare event data
    const eventData = {
      deletedBy: user1,
      userId: user2,
      timestamp: new Date(),
    };

    // Broadcast the event to all connected clients
    // This ensures both users receive the event regardless of their socket connection status
    io.emit("chat-deleted", eventData);

    return res.status(200).json({
      success: true,
      message: "Chat deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Error in deleteChat:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete chat",
      error: err.message,
    });
  }
};
