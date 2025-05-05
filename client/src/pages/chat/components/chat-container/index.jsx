import { useEffect } from "react";
import { useSocket } from "@/contexts/SocketContext";
import { useAppStore } from "@/store";
import { useTheme } from "@/contexts/ThemeContext";

import ChatHeader from "./components/chat-header";
import MessageBar from "./components/message-bar";
import MessageContainer from "./components/message-container";

const ChatContainer = () => {
  const socket = useSocket();
  const { theme } = useTheme();
  const {
    selectedChatData,
    selectedChatType,
    setSelectedChatMessages,
    updateChannelMembers,
    channels,
    setChannels,
    closeChat,
  } = useAppStore();

  useEffect(() => {
    if (!socket) return;

    // Listen for new messages in real-time
    socket.on("newMessage", (newMessage) => {
      if (
        (selectedChatType === "contact" &&
          newMessage.sender === selectedChatData._id) ||
        (selectedChatType === "channel" &&
          newMessage.channelId === selectedChatData._id)
      ) {
        setSelectedChatMessages((prevMessages) => [
          ...prevMessages,
          newMessage,
        ]);
      }
    });

    // Listen for channel updates (like new members being added or members leaving)
    socket.on("channel-updated", (data) => {
      if (
        selectedChatType === "channel" &&
        data.channelId === selectedChatData._id
      ) {
        if (data.action === "add-members" && data.newMembers) {
          updateChannelMembers(data.channelId, data.newMembers);
        } else if (data.action === "member-left") {
          // If a member left the channel, update the channel members
          const updatedChannels = channels.map((channel) => {
            if (channel._id === data.channelId) {
              // Remove the user who left from the members array
              const updatedMembers = channel.members.filter(
                (member) => member._id !== data.userId
              );
              return { ...channel, members: updatedMembers };
            }
            return channel;
          });

          setChannels(updatedChannels);

          // If the current user is viewing this channel, update the selected chat data
          if (selectedChatData && selectedChatData._id === data.channelId) {
            const updatedMembers = selectedChatData.members.filter(
              (member) => member._id !== data.userId
            );
            setSelectedChatData({
              ...selectedChatData,
              members: updatedMembers,
            });
          }
        }
      }
    });

    // Make sure to clean up event listeners when the component unmounts or dependencies change
    return () => {
      socket.off("newMessage");
      socket.off("channel-updated");
    };
  }, [
    socket,
    selectedChatData,
    selectedChatType,
    setSelectedChatMessages,
    updateChannelMembers,
    channels,
    setChannels,
    closeChat,
  ]);

  return (
    <div
      className="fixed top-0 h-[100vh] w-[100vw] flex flex-col md:static md:flex-1"
      style={{
        backgroundColor: theme === "default" ? "#1b1c24" : "",
      }}
    >
      <ChatHeader />
      <div
        className="flex-1 overflow-hidden relative"
        style={{
          backgroundImage:
            theme === "default"
              ? 'url("/purple.jpg")'
              : theme === "dark"
              ? 'url("/dark.jpg")'
              : theme === "cyberpunk"
              ? 'url("/cyberpunk.jpg")'
              : theme === "forest"
              ? 'url("/forest.jpg")'
              : theme === "ocean"
              ? 'url("/ocean.jpg")'
              : theme === "sunset"
              ? 'url("/sunset.jpg")'
              : "",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          transition: "background-image 0.3s ease-in-out",
        }}
      >
        <div className="absolute inset-0 bg-black/40 z-0"></div>
        <div className="relative z-10 flex flex-col h-full">
          <MessageContainer />
          <MessageBar />
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;
