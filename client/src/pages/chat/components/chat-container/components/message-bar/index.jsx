import { IoSend } from "react-icons/io5";
import { GrAttachment } from "react-icons/gr";
import { RiEmojiStickerLine } from "react-icons/ri";
import { IoVolumeHigh } from "react-icons/io5";
import EmojiPicker from "emoji-picker-react";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store";
import { useSocket } from "@/contexts/SocketContext";
import { MESSAGE_TYPES, UPLOAD_FILE } from "@/lib/constants";
import apiClient from "@/lib/api-client";
import { FaMicrophone } from "react-icons/fa";
import { FaPaperPlane } from "react-icons/fa";

const MessageBar = () => {
  const emojiRef = useRef();
  const fileInputRef = useRef();
  const inputRef = useRef();
  const {
    selectedChatData,
    userInfo,
    selectedChatType,
    setIsUploading,
    setFileUploadProgress,
  } = useAppStore();
  const [message, setMessage] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("Rachel");
  const [availableVoices, setAvailableVoices] = useState([
    "Rachel",
    "Domi",
    "Bella",
    "Antoni",
    "Arnold",
    "Adam",
  ]);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const socket = useSocket();
  let typingTimeout;

  // Function to check if message contains valid text for TTS
  const hasValidTextForTTS = (text) => {
    // Remove emojis and special characters, check if there's any text left
    const textWithoutEmojis = text.replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}\u{303D}\u{00A9}\u{00AE}\u{2122}\u{23F3}\u{24C2}\u{23E9}-\u{23EF}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2600}-\u{2604}\u{260E}\u{2611}\u{2614}-\u{2615}\u{2618}\u{2620}\u{2622}-\u{2623}\u{2626}\u{262A}\u{262E}-\u{262F}\u{2638}-\u{263A}\u{2648}-\u{2653}\u{2660}\u{2663}\u{2665}-\u{2666}\u{2668}\u{267B}\u{267E}-\u{267F}\u{2692}-\u{2697}\u{2699}\u{269B}-\u{269C}\u{26A0}-\u{26A1}\u{26A7}\u{26AA}-\u{26AB}\u{26B0}-\u{26B1}\u{26BD}-\u{26BE}\u{26C4}-\u{26C5}\u{26C8}\u{26CF}\u{26D1}\u{26D3}-\u{26D4}\u{26E9}-\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}\u{26FF}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2733}-\u{2734}\u{2744}\u{2747}\u{2757}\u{2763}-\u{2764}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{1F191}-\u{1F19A}\u{1F1E6}-\u{1F1FF}\u{1F201}-\u{1F202}\u{1F21A}\u{1F22F}\u{1F232}-\u{1F23A}\u{1F250}-\u{1F251}\u{1F300}-\u{1F321}\u{1F324}-\u{1F393}\u{1F396}-\u{1F397}\u{1F399}-\u{1F39B}\u{1F39E}-\u{1F3F0}\u{1F3F3}-\u{1F3F5}\u{1F3F7}-\u{1F3FA}\u{1F400}-\u{1F4FD}\u{1F4FF}-\u{1F53D}\u{1F549}-\u{1F54E}\u{1F550}-\u{1F567}\u{1F56F}-\u{1F570}\u{1F573}-\u{1F57A}\u{1F587}\u{1F58A}-\u{1F58D}\u{1F590}\u{1F595}-\u{1F596}\u{1F5A4}-\u{1F5A5}\u{1F5A8}\u{1F5B1}-\u{1F5B2}\u{1F5BC}\u{1F5C2}-\u{1F5C4}\u{1F5D1}-\u{1F5D3}\u{1F5DC}-\u{1F5DE}\u{1F5E1}\u{1F5E3}\u{1F5E8}\u{1F5EF}\u{1F5F3}\u{1F5FA}-\u{1F64F}\u{1F680}-\u{1F6C5}\u{1F6CB}-\u{1F6D2}\u{1F6E0}-\u{1F6E5}\u{1F6E9}\u{1F6EB}-\u{1F6EC}\u{1F6F0}\u{1F6F3}\u{1F910}-\u{1F93A}\u{1F93C}-\u{1F93E}\u{1F940}-\u{1F970}\u{1F973}-\u{1F976}\u{1F97A}\u{1F97C}\u{1F980}-\u{1F984}\u{1F986}-\u{1F98A}\u{1F98C}-\u{1F990}\u{1F992}-\u{1F997}\u{1F9C0}\u{1F9D0}-\u{1F9FF}]/gu,
      ""
    );
    // Remove other special characters but keep basic punctuation
    const cleanText = textWithoutEmojis.replace(/[^\p{L}\p{N}\s.,!?]/gu, "");
    return cleanText.trim().length > 0;
  };

  // Function to clean text for TTS
  const cleanTextForTTS = (text) => {
    // Remove emojis and special characters, keep only text and basic punctuation
    return text
      .replace(
        /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}\u{303D}\u{00A9}\u{00AE}\u{2122}\u{23F3}\u{24C2}\u{23E9}-\u{23EF}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2600}-\u{2604}\u{260E}\u{2611}\u{2614}-\u{2615}\u{2618}\u{2620}\u{2622}-\u{2623}\u{2626}\u{262A}\u{262E}-\u{262F}\u{2638}-\u{263A}\u{2648}-\u{2653}\u{2660}\u{2663}\u{2665}-\u{2666}\u{2668}\u{267B}\u{267E}-\u{267F}\u{2692}-\u{2697}\u{2699}\u{269B}-\u{269C}\u{26A0}-\u{26A1}\u{26A7}\u{26AA}-\u{26AB}\u{26B0}-\u{26B1}\u{26BD}-\u{26BE}\u{26C4}-\u{26C5}\u{26C8}\u{26CF}\u{26D1}\u{26D3}-\u{26D4}\u{26E9}-\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}\u{26FF}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2733}-\u{2734}\u{2744}\u{2747}\u{2757}\u{2763}-\u{2764}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{1F191}-\u{1F19A}\u{1F1E6}-\u{1F1FF}\u{1F201}-\u{1F202}\u{1F21A}\u{1F22F}\u{1F232}-\u{1F23A}\u{1F250}-\u{1F251}\u{1F300}-\u{1F321}\u{1F324}-\u{1F393}\u{1F396}-\u{1F397}\u{1F399}-\u{1F39B}\u{1F39E}-\u{1F3F0}\u{1F3F3}-\u{1F3F5}\u{1F3F7}-\u{1F3FA}\u{1F400}-\u{1F4FD}\u{1F4FF}-\u{1F53D}\u{1F549}-\u{1F54E}\u{1F550}-\u{1F567}\u{1F56F}-\u{1F570}\u{1F573}-\u{1F57A}\u{1F587}\u{1F58A}-\u{1F58D}\u{1F590}\u{1F595}-\u{1F596}\u{1F5A4}-\u{1F5A5}\u{1F5A8}\u{1F5B1}-\u{1F5B2}\u{1F5BC}\u{1F5C2}-\u{1F5C4}\u{1F5D1}-\u{1F5D3}\u{1F5DC}-\u{1F5DE}\u{1F5E1}\u{1F5E3}\u{1F5E8}\u{1F5EF}\u{1F5F3}\u{1F5FA}-\u{1F64F}\u{1F680}-\u{1F6C5}\u{1F6CB}-\u{1F6D2}\u{1F6E0}-\u{1F6E5}\u{1F6E9}\u{1F6EB}-\u{1F6EC}\u{1F6F0}\u{1F6F3}\u{1F910}-\u{1F93A}\u{1F93C}-\u{1F93E}\u{1F940}-\u{1F970}\u{1F973}-\u{1F976}\u{1F97A}\u{1F97C}\u{1F980}-\u{1F984}\u{1F986}-\u{1F98A}\u{1F98C}-\u{1F990}\u{1F992}-\u{1F997}\u{1F9C0}\u{1F9D0}-\u{1F9FF}]/gu,
        ""
      )
      .replace(/[^\p{L}\p{N}\s.,!?]/gu, "")
      .trim();
  };

  // Auto-focus the input field when chat is opened or changed
  useEffect(() => {
    if (selectedChatData && inputRef.current) {
      // Short timeout to ensure the DOM is fully rendered
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [selectedChatData]);

  // Fetch available voices on component mount
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await apiClient.get("/api/tts/voices");
        if (response.data && response.data.voices) {
          setAvailableVoices(response.data.voices);
        }
      } catch (error) {
        console.error("Error fetching voices:", error);
        // Fallback to default voices if API call fails
      }
    };
    fetchVoices();
  }, []);

  // Remove the automatic TTS enabling based on message content
  // TTS will now only be enabled when explicitly clicked by the user

  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setEmojiPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [emojiRef]);

  useEffect(() => {
    if (selectedChatType === "channel" && socket) {
      socket.emit("joinChannels", [selectedChatData._id]);
    }
  }, [selectedChatData, selectedChatType, socket]);

  const handleAddEmoji = (emoji) => {
    setMessage((msg) => msg + emoji.emoji);
  };

  const handleTyping = () => {
    if (!socket) return;

    if (selectedChatType === "contact") {
      socket.emit("typing", { recipientId: selectedChatData._id });
    } else if (selectedChatType === "channel") {
      socket.emit("channelTyping", { channelId: selectedChatData._id });
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      if (selectedChatType === "contact") {
        socket.emit("stopTyping", { recipientId: selectedChatData._id });
      } else if (selectedChatType === "channel") {
        socket.emit("stopChannelTyping", { channelId: selectedChatData._id });
      }
    }, 2000);
  };

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
    if (event.target.value.trim()) {
      handleTyping();
    } else {
      if (selectedChatType === "contact") {
        socket.emit("stopTyping", { recipientId: selectedChatData._id });
      } else if (selectedChatType === "channel") {
        socket.emit("stopChannelTyping", { channelId: selectedChatData._id });
      }
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !socket) return;

    // Stop typing when the message is sent
    if (selectedChatType === "contact") {
      socket.emit("stopTyping", { recipientId: selectedChatData._id });
    } else if (selectedChatType === "channel") {
      socket.emit("stopChannelTyping", { channelId: selectedChatData._id });
    }

    console.log("🚀 Sending message:", message);

    if (isTtsEnabled) {
      setIsGeneratingAudio(true);
      try {
        console.log("Generating audio with voice:", selectedVoice);
        // Clean the text for TTS, removing emojis and special characters
        const cleanText = cleanTextForTTS(message);

        const response = await apiClient.post("/api/tts/send-voice", {
          recipientId: selectedChatData._id,
          text: cleanText,
          voiceName: selectedVoice,
        });

        console.log("Audio generation response:", response.data);

        const messagePayload = {
          sender: userInfo.id,
          content: message, // Keep the original message with emojis
          messageType: MESSAGE_TYPES.AUDIO,
          audioUrl: response.data.audioUrl,
          voiceName: response.data.voiceName,
          timestamp: new Date().toISOString(),
        };

        if (selectedChatType === "contact") {
          socket.emit("sendMessage", {
            ...messagePayload,
            recipient: selectedChatData._id,
          });
        } else if (selectedChatType === "channel") {
          socket.emit("send-channel-message", {
            ...messagePayload,
            channelId: selectedChatData._id,
          });
        }
      } catch (error) {
        console.error("Error generating audio:", error);
        // Fallback to text message if audio generation fails
        const messagePayload = {
          sender: userInfo.id,
          content: message,
          messageType: MESSAGE_TYPES.TEXT,
          timestamp: new Date().toISOString(),
        };

        if (selectedChatType === "contact") {
          socket.emit("sendMessage", {
            ...messagePayload,
            recipient: selectedChatData._id,
          });
        } else if (selectedChatType === "channel") {
          socket.emit("send-channel-message", {
            ...messagePayload,
            channelId: selectedChatData._id,
          });
        }
      } finally {
        setIsGeneratingAudio(false);
      }
    } else {
      const messagePayload = {
        sender: userInfo.id,
        content: message,
        messageType: MESSAGE_TYPES.TEXT,
        timestamp: new Date().toISOString(),
      };

      if (selectedChatType === "contact") {
        socket.emit("sendMessage", {
          ...messagePayload,
          recipient: selectedChatData._id,
        });
      } else if (selectedChatType === "channel") {
        socket.emit("send-channel-message", {
          ...messagePayload,
          channelId: selectedChatData._id,
        });
      }
    }

    setMessage("");
  };

  const handleAttachmentChange = async (event) => {
    try {
      const file = event.target.files[0];

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        setIsUploading(true);
        const response = await apiClient.post(UPLOAD_FILE, formData, {
          withCredentials: true,
          onUploadProgress: (data) => {
            setFileUploadProgress(Math.round((100 * data.loaded) / data.total));
          },
        });

        if (response.status === 200 && response.data) {
          setIsUploading(false);
          const fileMessagePayload = {
            sender: userInfo.id,
            messageType: MESSAGE_TYPES.FILE,
            fileUrl: response.data.filePath,
          };

          if (selectedChatType === "contact") {
            socket.emit("sendMessage", {
              ...fileMessagePayload,
              recipient: selectedChatData._id,
            });
          } else if (selectedChatType === "channel") {
            socket.emit("send-channel-message", {
              ...fileMessagePayload,
              channelId: selectedChatData._id,
            });
          }
        }
      }
    } catch (error) {
      setIsUploading(false);
      console.log({ error });
    }
  };

  const handleAttachmentClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleKeyDown = (e) => {
    if (e && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      try {
        handleSendMessage();
      } catch (error) {
        console.log({ error });
      }
    }
  };

  const toggleTts = () => {
    // Only enable TTS if there's valid text content
    if (!isTtsEnabled && hasValidTextForTTS(message)) {
      setIsTtsEnabled(true);
    } else {
      setIsTtsEnabled(false);
    }
    console.log("TTS toggled:", !isTtsEnabled);
  };

  return (
    // Maintain the same structure but optimize for all screen sizes
    <div className="message-bar flex items-center gap-1 sm:gap-2 p-1 sm:p-2 px-2 sm:px-4 md:px-8">
      <div className="flex-1 flex bg-[#2a2b33]/90 backdrop-blur-sm rounded-md items-center gap-1 sm:gap-2 pr-1 sm:pr-2 min-w-0">
        <input
          ref={inputRef}
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="w-full p-1 sm:p-2 bg-transparent border-none outline-none text-white resize-none text-sm sm:text-base"
        />
        <button
          className="text-neutral-300 focus:border-none focus:outline-none focus:text-white transition-all duration-300 flex-shrink-0 p-1"
          onClick={handleAttachmentClick}
        >
          <GrAttachment className="text-lg sm:text-xl" />
        </button>
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleAttachmentChange}
        />
        <div className="relative flex-shrink-0">
          <button
            className="text-neutral-300 focus:border-none focus:outline-none focus:text-white transition-all duration-300 p-1"
            onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
          >
            <RiEmojiStickerLine className="text-lg sm:text-xl" />
          </button>
          {emojiPickerOpen && (
            <div
              className="absolute bottom-full right-0 mb-2 emoji-picker-container"
              ref={emojiRef}
              style={{
                zIndex: 1000,
                backgroundColor: "#1f1f1f",
                borderRadius: "8px",
                boxShadow: "0 0 10px rgba(0,0,0,0.5)",
                overflow: "hidden",
                maxWidth: "90vw",
              }}
            >
              <EmojiPicker
                theme="dark"
                onEmojiClick={handleAddEmoji}
                autoFocusSearch={false}
                searchDisabled={true}
                skinTonesDisabled={true}
                height={300}
                width={280}
              />
            </div>
          )}
        </div>
      </div>

      <select
        className="bg-gray-800 text-white p-1 sm:p-1.5 rounded-md text-xs sm:text-sm w-16 sm:w-24 md:w-32 lg:w-40 flex-shrink-0 overflow-hidden text-ellipsis"
        value={selectedVoice}
        onChange={(e) => setSelectedVoice(e.target.value)}
        disabled={!isTtsEnabled}
      >
        {availableVoices.map((voice) => (
          <option key={voice} value={voice}>
            {voice}
          </option>
        ))}
      </select>
      <button
        className={`tts-button text-xs sm:text-sm px-1 sm:px-2 py-1 sm:py-1.5 flex-shrink-0 ${
          isTtsEnabled ? "active" : ""
        }`}
        onClick={toggleTts}
        disabled={isGeneratingAudio}
      >
        {isGeneratingAudio ? (
          <span className="loading loading-spinner loading-xs sm:loading-sm"></span>
        ) : isTtsEnabled ? (
          "TTS Off"
        ) : (
          "TTS"
        )}
      </button>
      <button
        className="send-button flex-shrink-0"
        onClick={handleSendMessage}
        disabled={!message.trim()}
      >
        <FaPaperPlane className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
      </button>
    </div>
  );
};

export default MessageBar;

// Replace the existing className with this
<div className="message-bar-fixed border-t border-white/10 p-4">
  {/* Rest of your message bar content */}
</div>;
