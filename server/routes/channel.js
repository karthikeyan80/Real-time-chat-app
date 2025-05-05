router.post("/leave", authMiddleware, leaveChannel);
router.delete("/disband/:channelId", authMiddleware, disbandChannel);
