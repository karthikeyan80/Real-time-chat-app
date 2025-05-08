import mongoose from "mongoose";
import Channel from "../model/ChannelModel.js";
import User from "../model/UserModel.js";
import Message from "../model/MessagesModel.js";

export const createChannel = async (request, response, next) => {
  try {
    const { name, members } = request.body;
    const userId = request.userId;
    const admin = await User.findById(userId);
    if (!admin) {
      return response.status(400).json({ message: "Admin user not found." });
    }

    const validMembers = await User.find({ _id: { $in: members } });
    if (validMembers.length !== members.length) {
      return response
        .status(400)
        .json({ message: "Some members are not valid users." });
    }

    // Add the admin to the members array if not already included
    const allMembers = [...members];
    if (!allMembers.includes(userId)) {
      allMembers.push(userId);
    }

    const newChannel = new Channel({
      name,
      members: allMembers,
      admin: userId,
    });

    await newChannel.save();

    // Populate the channel with member and admin details before returning
    const populatedChannel = await Channel.findById(newChannel._id)
      .populate("admin", "firstName lastName email _id image color")
      .populate("members", "firstName lastName email _id image color");

    return response.status(201).json({ channel: populatedChannel });
  } catch (error) {
    console.error("Error creating channel:", error);
    return response.status(500).json({ message: "Internal Server Error" });
  }
};

export const addMembersToChannel = async (request, response) => {
  try {
    const { channelId, members } = request.body;
    const userId = request.userId;

    console.log("Adding members to channel:", {
      channelId,
      userId,
      membersToAdd: members,
    });

    // Find the channel and check if the user is a member
    const channel = await Channel.findById(channelId)
      .populate("admin", "firstName lastName email _id image color")
      .populate("members", "firstName lastName email _id image color");

    if (!channel) {
      console.log("Channel not found:", channelId);
      return response.status(404).json({ message: "Channel not found" });
    }

    // Validate that all members exist
    const validMembers = await User.find({ _id: { $in: members } });
    if (validMembers.length !== members.length) {
      console.log("Some members are not valid users");
      return response
        .status(400)
        .json({ message: "Some members are not valid users" });
    }

    // Add new members to the channel, excluding those who are already members and the admin
    const existingMemberIds = channel.members.map((member) =>
      member._id.toString()
    );
    const adminId = channel.admin._id.toString();
    const newMembers = members.filter(
      (memberId) =>
        !existingMemberIds.includes(memberId.toString()) &&
        memberId.toString() !== adminId
    );

    console.log("New members to add:", newMembers);

    if (newMembers.length === 0) {
      console.log("No new members to add");
      return response
        .status(400)
        .json({ message: "All selected users are already members" });
    }

    channel.members = [...channel.members, ...newMembers];
    await channel.save();
    console.log("Channel updated with new members");

    // Get the full user details for the new members
    const newMembersDetails = await User.find(
      { _id: { $in: newMembers } },
      "firstName lastName email _id image color"
    );
    console.log(
      "New members details:",
      newMembersDetails.map((m) => m._id.toString())
    );

    return response.status(200).json({ newMembers: newMembersDetails });
  } catch (error) {
    console.error("Error adding members to channel:", error);
    return response.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserChannels = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const channels = await Channel.find({
      $or: [{ admin: userId }, { members: userId }],
    })
      .populate("admin", "firstName lastName email _id image color")
      .populate("members", "firstName lastName email _id image color")
      .sort({ updatedAt: -1 });

    // Transform the channels to include admin in member count
    const transformedChannels = channels.map((channel) => {
      const channelObj = channel.toObject();
      // Add admin to members if not already included
      const adminInMembers = channelObj.members.some(
        (member) => member._id.toString() === channelObj.admin._id.toString()
      );
      if (!adminInMembers) {
        channelObj.members = [...channelObj.members, channelObj.admin];
      }
      return channelObj;
    });

    return res.status(200).json({ channels: transformedChannels });
  } catch (error) {
    console.error("Error getting user channels:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getChannelMessages = async (req, res, next) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findById(channelId).populate({
      path: "messages",
      populate: {
        path: "sender",
        select: "firstName lastName email _id image color",
      },
    });

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    // Ensure messages have status field visible
    const messagesWithStatus = channel.messages.map((message) => {
      // Convert to plain object to include all fields including status
      const messageObj = message.toObject ? message.toObject() : message;
      // Make sure status field exists
      if (!messageObj.status) {
        messageObj.status = "sent";
      }
      return messageObj;
    });

    return res.status(200).json({ messages: messagesWithStatus });
  } catch (error) {
    console.error("Error getting channel messages:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const leaveChannel = async (request, response) => {
  try {
    const { channelId } = request.params;
    const userId = request.userId;

    console.log("User leaving channel:", {
      channelId,
      userId,
    });

    // Find the channel
    const channel = await Channel.findById(channelId);
    if (!channel) {
      console.log("Channel not found:", channelId);
      return response.status(404).json({ message: "Channel not found" });
    }

    console.log("Channel found:", {
      channelId: channel._id,
      channelName: channel.name,
      channelMembers: channel.members.map((m) => m.toString()),
    });

    // Convert userId to ObjectId for proper comparison
    const userObjectId = new mongoose.Types.ObjectId(userId);
    console.log("User ObjectId:", userObjectId.toString());

    // Check if user is a member
    const isMember = channel.members.some(
      (memberId) => memberId.toString() === userObjectId.toString()
    );
    console.log("Is user a member?", isMember);

    // If user is not a member, return error
    if (!isMember) {
      console.log("User is not a member, cannot leave");
      return response.status(403).json({
        message: "You are not a member of this channel",
      });
    }

    // Remove user from members array
    channel.members = channel.members.filter(
      (memberId) => memberId.toString() !== userObjectId.toString()
    );

    await channel.save();
    console.log("User removed from channel");

    return response.status(200).json({
      message: "Successfully left the channel",
      channelId: channel._id,
      userId: userObjectId,
    });
  } catch (error) {
    console.error("Error leaving channel:", error);
    return response.status(500).json({ message: "Internal Server Error" });
  }
};

export const disbandChannel = async (request, response) => {
  try {
    const { channelId } = request.params;
    const userId = request.userId;

    console.log("User disbanding channel:", {
      channelId,
      userId,
    });

    // Find the channel
    const channel = await Channel.findById(channelId);
    if (!channel) {
      console.log("Channel not found:", channelId);
      return response.status(404).json({ message: "Channel not found" });
    }

    // Check if user is the admin
    if (channel.admin.toString() !== userId) {
      console.log("User is not admin, cannot disband channel");
      return response.status(403).json({
        message: "Only the channel admin can disband the channel",
      });
    }

    // Delete all messages associated with the channel
    await Message.deleteMany({ channel: channelId });

    // Delete the channel
    await Channel.findByIdAndDelete(channelId);

    // Notify members through socket with different messages for admin and other members
    const io = request.app.get("io");
    channel.members.forEach((memberId) => {
      const isAdmin = memberId.toString() === userId;
      io.to(memberId.toString()).emit("channel-disbanded", {
        channelId,
        disbandedBy: userId,
        isAdmin,
        channelName: channel.name,
      });
    });

    return response.status(200).json({
      message: "Channel disbanded successfully",
      channelId: channel._id,
    });
  } catch (error) {
    console.error("Error disbanding channel:", error);
    return response.status(500).json({ message: "Internal Server Error" });
  }
};
