const disbandChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    // Find the channel and check if user is admin
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (channel.createdBy.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Only channel admin can disband the channel" });
    }

    // Delete all messages associated with the channel
    await Message.deleteMany({ channel: channelId });

    // Delete the channel
    await Channel.findByIdAndDelete(channelId);

    // Notify all members through socket
    const io = req.app.get("io");
    channel.members.forEach((memberId) => {
      io.to(memberId.toString()).emit("channel-disbanded", {
        channelId,
        disbandedBy: userId,
      });
    });

    res.status(200).json({ message: "Channel disbanded successfully" });
  } catch (error) {
    console.error("Error in disbandChannel:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  disbandChannel,
};
