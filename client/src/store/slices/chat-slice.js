import { removeChannelById, addChannelIfNotExists } from "@/utils/channelUtils";

export const createChatSlice = (set, get) => ({
  selectedChatType: undefined,
  selectedChatData: undefined,
  selectedChatMessages: [],
  directMessagesContacts: [],
  channels: [],
  isUploading: false,
  fileUploadProgress: 0,
  isDownloading: false,
  downloadProgress: 0,
  setIsUploading: (isUploading) => set({ isUploading }),
  setFileUploadProgress: (fileUploadProgress) => set({ fileUploadProgress }),
  setIsDownloading: (isDownloading) => set({ isDownloading }),
  setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
  setSelectedChatType: (selectedChatType) => set({ selectedChatType }),
  setSelectedChatData: (selectedChatData) => set({ selectedChatData }),
  setChannels: (channels) => set({ channels }),
  setSelectedChatMessages: (selectedChatMessages) =>
    set({ selectedChatMessages }),
  setDirectMessagesContacts: (directMessagesContacts) =>
    set({ directMessagesContacts }),
  closeChat: () =>
    set({
      selectedChatData: undefined,
      selectedChatType: undefined,
      selectedChatMessages: [],
    }),
  addMessage: (message) => {
    const selectedChatMessages = get().selectedChatMessages;
    const selectedChatType = get().selectedChatType;
    set({
      selectedChatMessages: [
        ...selectedChatMessages,
        {
          ...message,
          recipient:
            selectedChatType === "channel"
              ? message.recipent
              : message.recipient._id,
          sender:
            selectedChatType === "channel"
              ? message.sender
              : message.sender._id,
        },
      ],
    });
  },
  updateMessageStatus: (messageId, status) => {
    const selectedChatMessages = get().selectedChatMessages;

    console.log(`🔧 Store: Updating message ${messageId} to status: ${status}`);

    if (!Array.isArray(selectedChatMessages)) {
      console.error(
        "❌ selectedChatMessages is not an array:",
        selectedChatMessages
      );
      return;
    }

    // Find the message by ID
    const targetMessage = selectedChatMessages.find(
      (msg) => msg._id === messageId
    );
    if (!targetMessage) {
      console.warn(
        `⚠️ Message with ID ${messageId} not found in current messages`
      );
      // Continue anyway in case there's a reference mismatch but ID is correct
    } else {
      console.log(
        `✅ Found message to update: ${targetMessage._id} from ${targetMessage.status} to ${status}`
      );
    }

    // Create a completely new array to guarantee React re-renders
    const updatedMessages = selectedChatMessages.map((message) => {
      if (message._id === messageId) {
        // Create a completely new object for the message
        return {
          ...message,
          status,
          _updatedAt: new Date().getTime(), // Add a timestamp to force React to see this as a new object
        };
      }
      return message;
    });

    // Use a completely new array reference and schedule an immediate update
    console.log(`📊 Updated messages array (${updatedMessages.length} items)`);

    // Force a synchronous update to the state
    set((state) => ({
      ...state,
      selectedChatMessages: [...updatedMessages],
    }));

    // Schedule another update after a short delay to ensure UI refresh
    setTimeout(() => {
      const currentMessages = get().selectedChatMessages;
      set({ selectedChatMessages: [...currentMessages] });
    }, 50);
  },
  addChannel: (channel) => {
    const channels = get().channels;
    const updatedChannels = addChannelIfNotExists(channels, channel);
    set({ channels: updatedChannels });
  },
  updateChannelMembers: (channelId, newMembers) => {
    const channels = get().channels;
    const updatedChannels = channels.map((channel) => {
      if (channel._id === channelId) {
        return {
          ...channel,
          members: [...channel.members, ...newMembers],
        };
      }
      return channel;
    });
    set({ channels: updatedChannels });

    // Also update the selected chat data if it's the current channel
    const selectedChatData = get().selectedChatData;
    if (selectedChatData && selectedChatData._id === channelId) {
      set({
        selectedChatData: {
          ...selectedChatData,
          members: [...selectedChatData.members, ...newMembers],
        },
      });
    }
  },
  removeChannel: (channelId) => {
    const channels = get().channels;
    const updatedChannels = removeChannelById(channels, channelId);
    set({ channels: updatedChannels });

    // If the removed channel was selected, close the chat
    const selectedChatData = get().selectedChatData;
    if (selectedChatData && selectedChatData._id === channelId) {
      set({
        selectedChatData: undefined,
        selectedChatType: undefined,
        selectedChatMessages: [],
      });
    }
  },
  addContactInDMContacts: (message) => {
    console.log({ message });
    const userId = get().userInfo.id;
    const fromId =
      message.sender._id === userId
        ? message.recipient._id
        : message.sender._id;
    const fromData =
      message.sender._id === userId ? message.recipient : message.sender;
    const dmContacts = get().directMessagesContacts;
    const data = dmContacts.find((contact) => contact._id === fromId);
    const index = dmContacts.findIndex((contact) => contact._id === fromId);
    console.log({ data, index, dmContacts, userId, message, fromData });
    if (index !== -1 && index !== undefined) {
      console.log("in if condition");
      dmContacts.splice(index, 1);
      dmContacts.unshift(data);
    } else {
      console.log("in else condition");
      dmContacts.unshift(fromData);
    }
    set({ directMessagesContacts: dmContacts });
  },
  addChannelInChannelLists: (message) => {
    const channels = get().channels;
    const data = channels.find((channel) => channel._id === message.channelId);
    const index = channels.findIndex(
      (channel) => channel._id === message.channelId
    );
    if (index !== -1 && index !== undefined) {
      channels.splice(index, 1);
      channels.unshift(data);
    }
  },
});
