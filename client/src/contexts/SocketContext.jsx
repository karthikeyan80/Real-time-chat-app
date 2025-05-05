import { SOCKET_HOST } from "@/lib/constants";
import { useAppStore } from "@/store";
import React, { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";

// Create a context with a default value of null
const SocketContext = createContext(null);

export const useSocket = () => {
  const socket = useContext(SocketContext);
  // Return null if socket is not available
  return socket;
};

export const SocketProvider = ({ children }) => {
  const socket = useRef(null);
  const {
    userInfo,
    setChannels,
    selectedChatData,
    setSelectedChatData,
    selectedChatType,
    setSelectedChatType,
    setSelectedChatMessages,
    directMessagesContacts,
    setDirectMessagesContacts,
    closeChat,
  } = useAppStore();

  // Handle socket disconnection when component unmounts
  useEffect(() => {
    return () => {
      if (socket.current) {
        console.log("Disconnecting socket on unmount");
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (userInfo) {
      try {
        // Only create a new socket connection if it doesn't exist or is disconnected
        if (!socket.current) {
          socket.current = io(SOCKET_HOST, {
            withCredentials: true,
            query: { userId: userInfo.id },
          });
        }

        socket.current.on("connect", () => {
          console.log("Connected to socket server");
        });

        socket.current.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
        });

        const handleReceiveMessage = (message) => {
          // Access the latest state values
          const {
            selectedChatData: currentChatData,
            selectedChatType: currentChatType,
            addMessage,
            addContactInDMContacts,
          } = useAppStore.getState();

          if (
            currentChatType !== undefined &&
            (currentChatData._id === message.sender._id ||
              currentChatData._id === message.recipient._id)
          ) {
            addMessage(message);
          }
          addContactInDMContacts(message);
        };

        const handleReceiveChannelMessage = (message) => {
          const {
            selectedChatData,
            selectedChatType,
            addMessage,
            addChannelInChannelLists,
          } = useAppStore.getState();

          if (
            selectedChatType !== undefined &&
            selectedChatData._id === message.channelId
          ) {
            addMessage(message);
          }
          addChannelInChannelLists(message);
        };

        const addNewChannel = (channel) => {
          const { addChannel, channels, userInfo } = useAppStore.getState();

          console.log("Received new channel:", channel);
          console.log("Existing channels:", channels);

          // Check if channel already exists to prevent duplicates
          const channelExists = channels.some((c) => c._id === channel._id);

          if (!channelExists) {
            console.log("Adding new channel to list:", channel.name);
            addChannel(channel);
            // Show notification for new channel
            toast.success(`New channel "${channel.name}" has been created`);
          } else {
            console.log("Channel already exists, not adding:", channel.name);
          }
        };

        const handleChatDeleted = (data) => {
          console.log("Chat deleted event received:", data);

          // Only process the deletion if the current user is involved in the deleted chat
          if (userInfo.id === data.userId || userInfo.id === data.deletedBy) {
            // Find the contact info for display purposes
            const contactId =
              userInfo.id === data.deletedBy ? data.userId : data.deletedBy;
            const deletedContact = directMessagesContacts.find(
              (contact) => contact._id === contactId
            );

            const contactName = deletedContact
              ? `${deletedContact.firstName} ${deletedContact.lastName}`
              : "Unknown contact";

            // Remove only the specific chat between the two users involved
            const updatedContacts = directMessagesContacts.filter(
              (contact) =>
                !(
                  contact._id === data.userId || contact._id === data.deletedBy
                ) || contact._id !== contactId // Keep contacts that aren't part of this deletion
            );
            setDirectMessagesContacts(updatedContacts);

            // If either user is viewing the deleted chat, close it
            if (
              selectedChatType === "contact" &&
              selectedChatData &&
              (selectedChatData._id === data.userId ||
                selectedChatData._id === data.deletedBy)
            ) {
              // Only close the chat if the current user is involved
              if (selectedChatData._id === contactId) {
                // Clear messages first to prevent any UI flicker
                setSelectedChatMessages([]);
                // Then close the chat
                closeChat();
              }
            }

            // Show appropriate notification based on who deleted the chat
            if (userInfo.id === data.deletedBy) {
              toast.success(`Chat with ${contactName} deleted successfully`);
            } else {
              toast.info(
                `Chat with ${contactName} was deleted by the other user`
              );
            }
          }
        };

        // Clean up any existing event listeners before adding new ones
        socket.current.off("receiveMessage");
        socket.current.off("recieve-channel-message");
        socket.current.off("new-channel-added");
        socket.current.off("channel-created");
        socket.current.off("chat-deleted");
        socket.current.off("channel-disbanded");

        // Add new event listeners
        socket.current.on("receiveMessage", handleReceiveMessage);
        socket.current.on(
          "recieve-channel-message",
          handleReceiveChannelMessage
        );
        socket.current.on("new-channel-added", addNewChannel);
        socket.current.on("chat-deleted", handleChatDeleted);

        socket.current.on(
          "channel-disbanded",
          ({ channelId, disbandedBy, isAdmin, channelName }) => {
            // Use the store's removeChannel function which is now safer
            const { removeChannel } = useAppStore.getState();
            console.log(
              "Disbanding channel received: ",
              channelId,
              channelName
            );

            // Use the safer method to remove the channel
            removeChannel(channelId);

            // If the user was viewing the disbanded channel, close the chat
            if (selectedChatData?._id === channelId) {
              setSelectedChatData(undefined);
              setSelectedChatType(undefined);
              setSelectedChatMessages([]);
            }

            // Show different notifications based on whether the user is the admin
            if (isAdmin) {
              toast.success(
                `Channel "${channelName}" has been disbanded successfully`
              );
            } else {
              toast.info(
                `The channel "${channelName}" has been disbanded by the admin`
              );
            }
          }
        );

        return () => {
          if (socket.current) {
            socket.current.off("receiveMessage");
            socket.current.off("recieve-channel-message");
            socket.current.off("new-channel-added");
            socket.current.off("channel-created");
            socket.current.off("chat-deleted");
            socket.current.off("channel-disbanded");
          }
        };
      } catch (error) {
        console.error("Error initializing socket:", error);
      }
    }
  }, [
    userInfo,
    setChannels,
    selectedChatData,
    setSelectedChatData,
    setSelectedChatType,
    setSelectedChatMessages,
    directMessagesContacts,
    setDirectMessagesContacts,
    closeChat,
  ]);

  return (
    <SocketContext.Provider value={socket.current}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
