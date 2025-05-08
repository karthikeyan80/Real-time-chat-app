import { HOST } from "@/lib/constants";
import { getColor } from "@/lib/utils";
import { useAppStore } from "@/store";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { RxExit } from "react-icons/rx";
import { RiDeleteBin5Line } from "react-icons/ri";
import { IoTrashBin } from "react-icons/io5";
import { HiOutlineInformationCircle } from "react-icons/hi";
import { useState } from "react";
import apiClient from "@/lib/api-client";
import { LEAVE_CHANNEL, DELETE_CHAT, DISBAND_CHANNEL } from "@/lib/constants";
import { toast } from "sonner";
import { useSocket } from "@/contexts/SocketContext";
import { useTheme } from "@/contexts/ThemeContext";

const ContactList = ({ contacts, isChannel = false }) => {
  const {
    selectedChatData,
    setSelectedChatType,
    setSelectedChatData,
    setSelectedChatMessages,
    userInfo,
    channels,
    setChannels,
    directMessagesContacts,
    setDirectMessagesContacts,
    removeChannel,
  } = useAppStore();
  const socket = useSocket();
  const [hoveredChannel, setHoveredChannel] = useState(null);
  const [hoveredContact, setHoveredContact] = useState(null);
  const { theme } = useTheme();

  const handleClick = (contact) => {
    if (isChannel) setSelectedChatType("channel");
    else setSelectedChatType("contact");
    setSelectedChatData(contact);
    if (selectedChatData && selectedChatData._id !== contact._id) {
      setSelectedChatMessages([]);
    }
  };

  const handleLeaveChannel = async (e, channel) => {
    e.stopPropagation(); // Prevent triggering the channel selection

    try {
      const response = await apiClient.delete(
        `${LEAVE_CHANNEL}/${channel._id}`,
        { withCredentials: true }
      );

      if (response.status === 200) {
        toast.success("Successfully left the channel");

        // Remove the channel from the channels list
        const updatedChannels = channels.filter((c) => c._id !== channel._id);
        setChannels(updatedChannels);

        // If the user was viewing the channel they just left, close the chat
        if (selectedChatData && selectedChatData._id === channel._id) {
          setSelectedChatData(undefined);
          setSelectedChatType(undefined);
          setSelectedChatMessages([]);
        }

        // Notify other members via socket
        if (socket) {
          socket.emit("channel-updated", {
            channelId: channel._id,
            updatedBy: userInfo.id,
            action: "member-left",
            userId: userInfo.id,
          });
        }
      }
    } catch (error) {
      console.error("Error leaving channel:", error);
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to leave the channel");
      }
    }
  };

  const handleDisbandChannel = async (e, channel) => {
    e.stopPropagation(); // Prevent triggering the channel selection

    try {
      const response = await apiClient.delete(
        `${DISBAND_CHANNEL}/${channel._id}`,
        { withCredentials: true }
      );

      if (response.status === 200) {
        // Remove the immediate toast notification to avoid duplicates
        // The notification will come from the socket event handler instead

        console.log("Channel disbanded successfully:", channel.name);

        // Use the safer removeChannel method to update local state
        // This ensures we're only removing the specific channel
        removeChannel(channel._id);

        // If the user was viewing the channel they just disbanded, close the chat
        if (selectedChatData && selectedChatData._id === channel._id) {
          setSelectedChatData(undefined);
          setSelectedChatType(undefined);
          setSelectedChatMessages([]);
        }

        // Notify all members via socket
        if (socket) {
          socket.emit("channel-disbanded", {
            channelId: channel._id,
            disbandedBy: userInfo.id,
            channelName: channel.name,
          });
        }
      }
    } catch (error) {
      console.error("Error disbanding channel:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to disband the channel");
      }
    }
  };

  const handleDeleteChat = async (e, contact) => {
    e.stopPropagation(); // Prevent triggering the contact selection

    try {
      const response = await apiClient.delete(DELETE_CHAT, {
        data: { id: contact._id },
        withCredentials: true,
      });

      // The UI update will be handled by the socket event handler
      // This ensures consistency between both users
      if (!response.data.success) {
        toast.error(response.data.message || "Failed to delete chat");
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to delete the chat";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="mt-5">
      {Array.isArray(contacts) && contacts.length > 0 ? (
        contacts.map((contact) => {
          // Debug logging for channels
          if (isChannel) {
            console.log("Channel Debug:", {
              channelName: contact.name,
              isChannel,
              hoveredChannel,
              contactId: contact._id,
              createdBy: contact.createdBy,
              userId: userInfo.id,
              isAdmin: contact.createdBy === userInfo.id,
              comparison: `${contact.createdBy} === ${userInfo.id}`,
            });
          }

          const themePrimaryColors = {
            default: "#8417ff",
            dark: "#1e293b",
            cyan: "#06b6d4",
            green: "#16a34a",
            blue: "#2563eb",
            sunset: "#ea580c",
          };
          const isSelected =
            selectedChatData && selectedChatData._id === contact._id;
          const isDefaultTheme = theme === "default";
          const selectedBgClass =
            isSelected && isDefaultTheme
              ? "bg-[#8417ff] hover:bg-[#8417ff]"
              : !isSelected
              ? "hover:bg-[#f1f1f111]"
              : "";
          const selectedBgStyle =
            isSelected && !isDefaultTheme
              ? {
                  backgroundColor:
                    themePrimaryColors[theme] || themePrimaryColors.default,
                }
              : {};

          return (
            <div
              key={contact._id}
              className={`pl-10 py-2 transition-all duration-300 cursor-pointer relative ${selectedBgClass}`}
              style={selectedBgStyle}
              onClick={() => handleClick(contact)}
              onMouseEnter={() => {
                if (isChannel) {
                  setHoveredChannel(contact._id);
                } else {
                  setHoveredContact(contact._id);
                }
              }}
              onMouseLeave={() => {
                if (isChannel) {
                  setHoveredChannel(null);
                } else {
                  setHoveredContact(null);
                }
              }}
            >
              <div className="flex gap-5 items-center justify-start text-neutral-300">
                {!isChannel && (
                  <Avatar className="h-10 w-10 ">
                    {contact.image && (
                      <AvatarImage
                        src={`${HOST}/${contact.image}`}
                        alt="profile"
                        className="rounded-full bg-cover h-full w-full"
                      />
                    )}

                    <AvatarFallback
                      className={`uppercase ${
                        selectedChatData && selectedChatData._id === contact._id
                          ? "bg-[#ffffff22] border border-white/50"
                          : getColor(contact.color)
                      } h-10 w-10 flex items-center justify-center rounded-full`}
                    >
                      {contact.name ? contact.name[0] : "#"}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {isChannel
                      ? contact.name
                      : `${contact.firstName} ${contact.lastName}`}
                  </span>
                  {isChannel && (
                    <span className="text-xs text-white">
                      {contact.members?.length || 0} members
                    </span>
                  )}
                </div>
              </div>

              {/* Leave Channel Button - Only show on hover for non-admin members */}
              {isChannel &&
                hoveredChannel === contact._id &&
                contact.admin._id !== userInfo.id && (
                  <button
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white-500 hover:text-red-400 transition-colors"
                    onClick={(e) => handleLeaveChannel(e, contact)}
                    title="Leave Channel"
                  >
                    <RxExit />
                  </button>
                )}

              {/* Disband Channel Button - Only show on hover for admin */}
              {isChannel &&
                hoveredChannel === contact._id &&
                contact.admin._id === userInfo.id && (
                  <button
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white-500 hover:text-red-400 transition-colors"
                    onClick={(e) => handleDisbandChannel(e, contact)}
                    title="Disband Channel"
                  >
                    <IoTrashBin />
                  </button>
                )}

              {/* Delete Chat Button - Only show on hover for direct messages */}
              {!isChannel && hoveredContact === contact._id && (
                <button
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white-500 hover:text-red-400 transition-colors"
                  onClick={(e) => handleDeleteChat(e, contact)}
                  title="Delete Chat"
                >
                  <RiDeleteBin5Line />
                </button>
              )}
            </div>
          );
        })
      ) : (
        <div className="flex flex-col items-center justify-center py-8 px-4 my-4 mx-2 rounded-lg bg-[#2c2e3b]/30 text-neutral-300">
          <HiOutlineInformationCircle className="text-3xl mb-2 text-purple-500" />
          <p className="text-sm font-medium">
            No {isChannel ? "channels" : "contacts"} available
          </p>
          <p className="text-xs text-neutral-400 mt-1 text-center">
            {isChannel
              ? "Create a channel to start a group conversation"
              : "Add contacts to start a conversation"}
          </p>
        </div>
      )}
    </div>
  );
};

export default ContactList;
