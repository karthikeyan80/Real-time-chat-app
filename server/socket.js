import { Server as SocketIOServer } from "socket.io";
import Message from "./model/MessagesModel.js";
import Channel from "./model/ChannelModel.js";
import mongoose from "mongoose";

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
  const unreadMessageCounts = new Map(); // Store unread message counts for each user

  // Make userSocketMap accessible through the io instance
  io.userSocketMap = userSocketMap;

  // Helper function to validate and convert to ObjectId
  const toObjectId = (id) => {
    try {
      if (!id || typeof id !== "string") return null;
      return new mongoose.Types.ObjectId(id);
    } catch (error) {
      console.error(`Invalid ObjectId format for id: ${id}`);
      return null;
    }
  };

  // Function to update unread message counts
  const updateUnreadCount = async (userId, chatId, increment = true) => {
    try {
      const key = `${userId}-${chatId}`;
      const currentCount = unreadMessageCounts.get(key) || 0;
      const newCount = increment ? currentCount + 1 : 0;
      unreadMessageCounts.set(key, newCount);

      // Get the user's socket ID
      const socketId = userSocketMap.get(userId);
      if (socketId) {
        io.to(socketId).emit("unread-count-update", {
          chatId,
          count: newCount,
        });
      }
    } catch (error) {
      console.error("Error updating unread count:", error);
    }
  };

  // Function to get all unread counts for a user
  const getUnreadCounts = async (userId) => {
    try {
      const counts = {};
      for (const [key, count] of unreadMessageCounts.entries()) {
        const [storedUserId, chatId] = key.split("-");
        if (storedUserId === userId && count > 0) {
          counts[chatId] = count;
        }
      }
      return counts;
    } catch (error) {
      console.error("Error getting unread counts:", error);
      return {};
    }
  };

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

    // Create the message with sent status
    const createdMessage = await Message.create({
      ...message,
      status: "sent", // Always start with sent status
    });

    // Find the created message by its ID and populate sender and recipient details
    const messageData = await Message.findById(createdMessage._id)
      .populate("sender", "id email firstName lastName image color")
      .populate("recipient", "id email firstName lastName image color")
      .exec();

    // Send message to recipient if online (but keep status as sent)
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receiveMessage", messageData);
      // Update unread count for recipient
      await updateUnreadCount(message.recipient, message.sender);
    }

    // Always send to sender with sent status
    if (senderSocketId) {
      io.to(senderSocketId).emit("receiveMessage", messageData);
    }

    // Stop the typing indicator immediately after sending a message
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("stopTyping", { senderId: message.sender });
    }
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
      status: "sent", // Default status for channel messages
    });

    const messageData = await Message.findById(createdMessage._id)
      .populate("sender", "id email firstName lastName image color")
      .exec();

    await Channel.findByIdAndUpdate(channelId, {
      $push: { messages: createdMessage._id },
    });

    const channel = await Channel.findById(channelId).populate("members");

    const finalData = {
      ...messageData._doc,
      channelId: channel._id,
      status: messageData.status || "sent", // Ensure status is included
    };

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

  // Function to mark all messages as read when chat is opened
  const markMessagesAsRead = async (userId, chatId) => {
    try {
      // Convert string IDs to ObjectId with validation
      const recipientId = toObjectId(userId);
      const senderId = toObjectId(chatId);

      // Skip if either ID is invalid
      if (!recipientId || !senderId) {
        console.error("Invalid user ID or chat ID format");
        return;
      }

      // Find all unread messages where the current user is the recipient
      const unreadMessages = await Message.find({
        sender: senderId,
        recipient: recipientId,
        status: { $ne: "read" },
      });

      if (unreadMessages.length > 0) {
        // Update all messages to read status
        await Message.updateMany(
          { _id: { $in: unreadMessages.map((msg) => msg._id) } },
          { status: "read" }
        );

        // Get the updated messages with populated sender and recipient
        const updatedMessages = await Message.find({
          _id: { $in: unreadMessages.map((msg) => msg._id) },
        })
          .populate("sender", "id email firstName lastName image color")
          .populate("recipient", "id email firstName lastName image color");

        // Notify both users about the read status
        const senderSocketId = userSocketMap.get(chatId);
        const recipientSocketId = userSocketMap.get(userId);

        // Create a unique timestamp for this update
        const updateTimestamp = Date.now();

        // Send updates to both users
        updatedMessages.forEach((message) => {
          const messageUpdate = {
            ...message.toObject(),
            _timestamp: updateTimestamp,
          };

          if (senderSocketId) {
            io.to(senderSocketId).emit("message-status-update", messageUpdate);
          }
          if (recipientSocketId) {
            io.to(recipientSocketId).emit(
              "message-status-update",
              messageUpdate
            );
          }
        });

        // Clear unread count only for the recipient
        await updateUnreadCount(userId, chatId, false);
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) {
      userSocketMap.set(userId, socket.id);
      console.log(`User connected: ${userId} with socket ID: ${socket.id}`);

      // Send initial unread counts when user connects
      getUnreadCounts(userId).then((counts) => {
        socket.emit("initial-unread-counts", counts);
      });
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

    // Keep and update message-read handler
    // Handle message read event with improved notifications
    socket.on("message-read", async ({ messageId, senderId }) => {
      try {
        console.log(
          `🔖 SERVER: Marking message ${messageId} as read from sender ${senderId}`
        );

        // Validate the message ID and senderId
        if (!messageId || !senderId) {
          console.error(
            "❌ Invalid message-read event: missing messageId or senderId"
          );
          return;
        }

        // Check if the message exists and get its current status
        const existingMessage = await Message.findById(messageId);
        if (!existingMessage) {
          console.error(`❌ Message with ID ${messageId} not found`);
          return;
        }

        // Only update if not already read
        if (existingMessage.status === "read") {
          console.log(
            `⏭️ Message ${messageId} is already marked as read, skipping update`
          );
          return;
        }

        console.log(
          `⚙️ Updating message ${messageId} status from ${existingMessage.status} to read`
        );

        // Update message status in database directly to read
        const updateResult = await Message.findByIdAndUpdate(
          messageId,
          { status: "read" },
          { new: true } // Return the updated document
        );

        // Get the fully populated message to send to clients
        const updatedMessage = await Message.findById(messageId)
          .populate("sender", "id email firstName lastName image color")
          .populate("recipient", "id email firstName lastName image color");

        console.log(
          `✅ Successfully updated message ${messageId} status to: ${updatedMessage.status}`
        );

        // Get the sender's socket ID
        const senderSocketId = userSocketMap.get(senderId);

        // Get recipient details (the current user's socket ID)
        const currentUserSocketId = socket.id;
        const currentUserId = Object.keys(userSocketMap).find(
          (key) => userSocketMap[key] === currentUserSocketId
        );

        console.log(
          `💌 Message exchange between sender ${senderId} and recipient ${currentUserId}`
        );

        // Create a unique timestamp for this update
        const updateTimestamp = Date.now();

        // Prepare the updated message object with timestamp
        const messageUpdate = {
          ...updatedMessage.toObject(),
          _timestamp: updateTimestamp,
        };

        // First, notify the sender immediately if they're online
        if (senderSocketId) {
          console.log(`🔔 Notifying sender ${senderId} about read status`);
          io.to(senderSocketId).emit("message-status-update", messageUpdate);
        }

        // Then notify the recipient
        console.log(
          `🔔 Notifying recipient ${currentUserId} about read status`
        );
        io.to(currentUserSocketId).emit("message-status-update", messageUpdate);

        // Broadcast to all other possible tabs/windows of these users
        for (const [userId, socketId] of userSocketMap.entries()) {
          if (
            (userId === senderId || userId === currentUserId) && // Is one of our users
            socketId !== senderSocketId && // Not the sender's main socket
            socketId !== currentUserSocketId // Not the recipient's main socket
          ) {
            console.log(
              `🔄 Syncing read status to additional socket ${socketId} for user ${userId}`
            );
            io.to(socketId).emit("message-status-update", messageUpdate);
          }
        }

        // Also emit to any sockets that might be in the chat room
        const chatRoom = `chat-${existingMessage.sender._id}-${existingMessage.recipient._id}`;
        io.to(chatRoom).emit("message-status-update", messageUpdate);

        // Reset unread count for the recipient
        await updateUnreadCount(
          updatedMessage.recipient._id,
          updatedMessage.sender._id,
          false
        );
      } catch (error) {
        console.error("❌ Error updating message read status:", error);
        console.error(error); // Log the full error
      }
    });

    // Add this handler to join chat rooms when users open a chat
    socket.on("join-chat", async ({ chatId }) => {
      try {
        socket.join(`chat-${chatId}`);
        console.log(`User ${socket.id} joined chat room: chat-${chatId}`);

        // Mark messages as read only if the current user is the recipient
        if (userId) {
          // Convert string IDs to ObjectId with validation
          const recipientId = toObjectId(userId);
          const senderId = toObjectId(chatId);

          // Skip if either ID is invalid
          if (!recipientId || !senderId) {
            console.error("Invalid user ID or chat ID format");
            return;
          }

          // Check if there are any unread messages where this user is the recipient
          const hasUnreadMessages = await Message.exists({
            sender: senderId,
            recipient: recipientId,
            status: { $ne: "read" },
          });

          if (hasUnreadMessages) {
            await markMessagesAsRead(userId, chatId);
          }
        }
      } catch (error) {
        console.error("Error in join-chat handler:", error);
      }
    });

    // Add this handler to leave chat rooms when users close a chat
    socket.on("leave-chat", ({ chatId }) => {
      socket.leave(`chat-${chatId}`);
      console.log(`User ${socket.id} left chat room: chat-${chatId}`);
    });

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

    // Add handler for getting unread counts
    socket.on("get-unread-counts", async () => {
      if (userId) {
        const counts = await getUnreadCounts(userId);
        socket.emit("initial-unread-counts", counts);
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
