import { Server as SocketIOServer } from "socket.io";
import Message from "./model/MessagesModel.js";
import Channel from "./model/ChannelModel.js";

const setupSocket = (server) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const userSocketMap = new Map();
  const typingTimeouts = new Map(); // Store timeouts for each user
  const channelTypingTimeouts = new Map(); // Store timeouts for each user in each channel

  // Make userSocketMap accessible through the io instance
  io.userSocketMap = userSocketMap;

  const addChannelNotify = async (channel) => {
    if (channel && channel.members) {
      // Populate the channel data with member and admin details
      const populatedChannel = await Channel.findById(channel._id)
        .populate("admin", "firstName lastName email _id image color")
        .populate("members", "firstName lastName email _id image color");

      // Emit to all members of the channel
      channel.members.forEach((member) => {
        const memberSocketId = userSocketMap.get(member.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("new-channel-added", populatedChannel);
        }
      });
    }
  };

  const sendMessage = async (message) => {
    const recipientSocketId = userSocketMap.get(message.recipient);
    const senderSocketId = userSocketMap.get(message.sender);

    // Create the message
    const createdMessage = await Message.create(message);

    // Find the created message by its ID and populate sender and recipient details
    const messageData = await Message.findById(createdMessage._id)
      .populate("sender", "id email firstName lastName image color")
      .populate("recipient", "id email firstName lastName image color")
      .exec();

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receiveMessage", messageData);
    }

    if (senderSocketId) {
      io.to(senderSocketId).emit("receiveMessage", messageData);
    }

    // Stop the typing indicator immediately after sending a message
    io.to(recipientSocketId).emit("stopTyping", { senderId: message.sender });
  };

  const sendChannelMessage = async (message) => {
    const {
      channelId,
      sender,
      content,
      messageType,
      fileUrl,
      audioUrl,
      voiceName,
    } = message;

    const createdMessage = await Message.create({
      sender,
      recipient: null, // Channel messages don't have a single recipient
      content,
      messageType,
      timestamp: new Date(),
      fileUrl,
      audioUrl,
      voiceName,
    });

    const messageData = await Message.findById(createdMessage._id)
      .populate("sender", "id email firstName lastName image color")
      .exec();

    await Channel.findByIdAndUpdate(channelId, {
      $push: { messages: createdMessage._id },
    });

    const channel = await Channel.findById(channelId).populate("members");

    const finalData = { ...messageData._doc, channelId: channel._id };

    // Get all unique recipients (members + admin) to prevent duplicates
    const recipients = new Set();

    // Add all members to the recipients set
    if (channel && channel.members) {
      channel.members.forEach((member) => {
        recipients.add(member._id.toString());
      });
    }

    // Add admin to recipients set if not already included
    if (channel && channel.admin) {
      recipients.add(channel.admin.toString());
    }

    // Send message to all unique recipients
    recipients.forEach((recipientId) => {
      const socketId = userSocketMap.get(recipientId);
      if (socketId) {
        io.to(socketId).emit("recieve-channel-message", finalData);
      }
    });

    // Stop the typing indicator for the channel after sending a message
    if (channelTypingTimeouts.has(channelId)) {
      const userTimeouts = channelTypingTimeouts.get(channelId);
      if (userTimeouts.has(sender)) {
        clearTimeout(userTimeouts.get(sender));
        userTimeouts.delete(sender);
      }
      io.to(channelId).emit("stopChannelTyping", {
        senderId: sender,
        channelId,
      });
    }
  };

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) {
      userSocketMap.set(userId, socket.id);
      console.log(`User connected: ${userId} with socket ID: ${socket.id}`);
    } else {
      console.log("User ID not provided during connection.");
    }

    // Join the user to all their channel rooms
    socket.on("joinChannels", (channelIds) => {
      channelIds.forEach((channelId) => {
        socket.join(channelId); // Join the socket to the channel room
      });
    });

    // ✅ DM Typing Indicator (with 2s timeout and stop on message send)
    socket.on("typing", ({ recipientId }) => {
      const recipientSocketId = userSocketMap.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("typing", { senderId: userId });

        // Clear any existing timeout for the user
        if (typingTimeouts.has(userId)) {
          clearTimeout(typingTimeouts.get(userId));
        }

        // Set a new timeout to stop typing after 2 seconds
        const timeout = setTimeout(() => {
          io.to(recipientSocketId).emit("stopTyping", { senderId: userId });
          typingTimeouts.delete(userId);
        }, 2000);

        typingTimeouts.set(userId, timeout);
      }
    });

    socket.on("stopTyping", ({ recipientId }) => {
      const recipientSocketId = userSocketMap.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("stopTyping", { senderId: userId });
      }
      // Clear timeout when typing is stopped manually
      if (typingTimeouts.has(userId)) {
        clearTimeout(typingTimeouts.get(userId));
        typingTimeouts.delete(userId);
      }
    });

    // ✅ Channel Typing Indicator
    socket.on("channelTyping", ({ channelId }) => {
      const channel = channelTypingTimeouts.get(channelId) || new Map();
      channelTypingTimeouts.set(channelId, channel);

      // Emit typing event to all members of the channel
      io.to(channelId).emit("channelTyping", { senderId: userId, channelId });

      // Clear any existing timeout for the user in the channel
      if (channel.has(userId)) {
        clearTimeout(channel.get(userId));
      }

      // Set a new timeout to stop typing after 2 seconds
      const timeout = setTimeout(() => {
        io.to(channelId).emit("stopChannelTyping", {
          senderId: userId,
          channelId,
        });
        channel.delete(userId);
      }, 2000);

      channel.set(userId, timeout);
    });

    socket.on("stopChannelTyping", ({ channelId }) => {
      const channel = channelTypingTimeouts.get(channelId);
      if (channel && channel.has(userId)) {
        clearTimeout(channel.get(userId));
        channel.delete(userId);
        io.to(channelId).emit("stopChannelTyping", {
          senderId: userId,
          channelId,
        });
      }
    });

    socket.on("add-channel-notify", addChannelNotify);

    socket.on("sendMessage", sendMessage);

    socket.on("send-channel-message", sendChannelMessage);

    socket.on("chat-deleted", async (data) => {
      const { deletedBy, userId } = data;

      // Get socket IDs for both users
      const deletedBySocketId = userSocketMap.get(deletedBy);
      const userSocketId = userSocketMap.get(userId);

      // Emit to both users
      if (deletedBySocketId) {
        io.to(deletedBySocketId).emit("chat-deleted", {
          deletedBy,
          userId,
          timestamp: new Date(),
        });
      }

      if (userSocketId) {
        io.to(userSocketId).emit("chat-deleted", {
          deletedBy,
          userId,
          timestamp: new Date(),
        });
      }
    });

    socket.on("channel-disbanded", (data) => {
      const { channelId, disbandedBy, channelName } = data;

      // Get all connected users
      for (const [userId, socketId] of userSocketMap.entries()) {
        // Determine if this user is the admin who disbanded the channel
        const isAdmin = userId === disbandedBy;

        // Send appropriate notification to each user
        io.to(socketId).emit("channel-disbanded", {
          channelId,
          disbandedBy,
          isAdmin,
          channelName,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected", socket.id);
      for (const [userId, socketId] of userSocketMap.entries()) {
        if (socketId === socket.id) {
          userSocketMap.delete(userId);
          break;
        }
      }
    });
  });

  return io;
};

export default setupSocket;
