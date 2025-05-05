import { RiCloseFill } from "react-icons/ri";
import { FaUserPlus } from "react-icons/fa";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useAppStore } from "@/store";
import { HOST } from "@/lib/constants";
import { getColor } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useSocket } from "@/contexts/SocketContext";
import AddMembersToChannel from "./add-members-to-channel";

const ChatHeader = () => {
  const { selectedChatData, closeChat, selectedChatType } = useAppStore();
  const socket = useSocket();
  const [typing, setTyping] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleTyping = ({ senderId, channelId }) => {
      if (
        (selectedChatType === "contact" && senderId === selectedChatData._id) ||
        (selectedChatType === "channel" && channelId === selectedChatData._id)
      ) {
        setTyping(true);
      }
    };

    const handleStopTyping = ({ senderId, channelId }) => {
      if (
        (selectedChatType === "contact" && senderId === selectedChatData._id) ||
        (selectedChatType === "channel" && channelId === selectedChatData._id)
      ) {
        setTyping(false);
      }
    };

    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("channelTyping", handleTyping);
    socket.on("stopChannelTyping", handleStopTyping);

    return () => {
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("channelTyping", handleTyping);
      socket.off("stopChannelTyping", handleStopTyping);
    };
  }, [socket, selectedChatData, selectedChatType]);

  return (
    <div className="h-[10vh] border-b-2 border-[#2f303b] bg-[#1b1c24] flex items-center justify-between px-4 sm:px-8 md:px-20">
      <div className="flex gap-2 sm:gap-5 items-center">
        <div className="flex gap-2 sm:gap-3 items-center justify-center">
          <div className="w-8 h-8 sm:w-12 sm:h-12 relative flex items-center justify-center">
            {selectedChatType === "contact" ? (
              <Avatar className="w-8 h-8 sm:w-12 sm:h-12 rounded-full overflow-hidden">
                {selectedChatData.image ? (
                  <AvatarImage
                    src={`${HOST}/${selectedChatData.image}`}
                    alt="profile"
                    className="object-cover w-full h-full bg-black rounded-full"
                  />
                ) : (
                  <div
                    className={`uppercase w-12 h-12 text-lg border-[1px] ${getColor(
                      selectedChatData.color
                    )} flex items-center justify-center rounded-full`}
                  >
                    {selectedChatData.firstName
                      ? selectedChatData.firstName.charAt(0)
                      : selectedChatData.email.charAt(0)}
                  </div>
                )}
              </Avatar>
            ) : (
              <div className="bg-[#ffffff22] py-2 sm:py-3 px-3 sm:px-5 flex items-center justify-center rounded-full">
                #
              </div>
            )}
          </div>
        </div>
        <div className="text-sm sm:text-base">
          {selectedChatType === "contact"
            ? `${selectedChatData.firstName || ""} ${
                selectedChatData.lastName || ""
              }`
            : selectedChatData.name}

          {typing && (
            <span className="ml-2 text-xs sm:text-sm text-gray-400">
              {selectedChatType === "contact"
                ? "is typing..."
                : "Someone is typing..."}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-center gap-5">
        {selectedChatType === "channel" && (
          <button
            className="text-neutral-300 focus:border-none focus:outline-none focus:text-white transition-all duration-300"
            onClick={() => setShowAddMembersModal(true)}
          >
            <FaUserPlus className="text-2xl" />
          </button>
        )}
        <button
          className="text-neutral-300 focus:border-none focus:outline-none focus:text-white transition-all duration-300"
          onClick={closeChat}
        >
          <RiCloseFill className="text-3xl" />
        </button>
      </div>

      {showAddMembersModal && (
        <AddMembersToChannel
          channel={selectedChatData}
          onClose={() => setShowAddMembersModal(false)}
        />
      )}
    </div>
  );
};

export default ChatHeader;
