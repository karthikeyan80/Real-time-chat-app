import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import apiClient from "@/lib/api-client";
import {
  FETCH_ALL_MESSAGES_ROUTE,
  GET_CHANNEL_MESSAGES,
  HOST,
  MESSAGE_TYPES,
} from "@/lib/constants";
import { getColor } from "@/lib/utils";
import { useAppStore } from "@/store";
import { useTheme } from "@/contexts/ThemeContext";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { IoMdArrowRoundDown } from "react-icons/io";
import { IoCloseSharp } from "react-icons/io5";
import { MdFolderZip } from "react-icons/md";
import { IoVolumeHigh } from "react-icons/io5";
import { IoPause, IoPlay } from "react-icons/io5";
import MessageStatus from "@/components/ui/message-status";
import { useSocket } from "@/contexts/SocketContext";

const MessageContainer = () => {
  const [showImage, setShowImage] = useState(false);
  const [imageURL, setImageURL] = useState(null);
  const [voices, setVoices] = useState([]); // Store available voices
  const [selectedVoice, setSelectedVoice] = useState(null); // Track selected voice
  const {
    selectedChatData,
    setSelectedChatMessages,
    selectedChatMessages,
    selectedChatType,
    userInfo,
    setDownloadProgress,
    setIsDownloading,
  } = useAppStore();
  const { theme } = useTheme();
  const messageEndRef = useRef(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showAudioOptions, setShowAudioOptions] = useState(false);
  const audioRef = useRef(null);
  const optionsRef = useRef(null);
  const messageRefs = useRef({});
  const containerRef = useRef(null);
  const socket = useSocket();

  const cleanTextForSpeech = (text) => {
    return text.replace(/[^\p{L}\p{N}\s.,!?]/gu, ""); // Remove all non-alphanumeric characters except punctuation
  };

  useEffect(() => {
    if ("speechSynthesis" in window) {
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        setVoices(availableVoices);
        if (availableVoices.length > 0) {
          setSelectedVoice(availableVoices[0].name); // Default to the first voice
        }
      };

      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices; // Reload voices when they change
    }
  }, []);

  // Stop audio when clicking outside of a message
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside any message but inside the chat container
      const isOutsideAnyMessage = Object.values(messageRefs.current).every(
        (ref) => !ref?.contains(event.target)
      );

      const isInsideChatContainer = containerRef.current?.contains(
        event.target
      );

      if (isOutsideAnyMessage && isInsideChatContainer && currentlyPlaying) {
        // Stop audio playback
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setCurrentlyPlaying(null);
        setIsPaused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [currentlyPlaying]);

  const playTTS = (text, voiceName) => {
    if ("speechSynthesis" in window) {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        return;
      }

      const cleanedText = cleanTextForSpeech(text);
      if (!cleanedText.trim()) {
        console.warn("TTS ignored: Message contains no valid text.");
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.lang = "en-US";
      utterance.rate = 1;

      // Set the voice if provided
      const voice = voices.find((v) => v.name === voiceName);
      if (voice) {
        utterance.voice = voice;
      }

      speechSynthesis.speak(utterance);
    } else {
      console.warn("Text-to-Speech is not supported in this browser.");
    }
  };

  useEffect(() => {
    // Add event listener for message status updates
    if (socket) {
      // Listen for message status updates
      const handleMessageStatusUpdate = (updatedMessage) => {
        console.log(
          "📱 MessageContainer: Received status update:",
          updatedMessage
        );

        // Verify we have a valid message
        if (!updatedMessage || !updatedMessage._id || !updatedMessage.status) {
          console.error("❌ Invalid message status update received");
          return;
        }

        // For debugging: check if this is a message sent by the current user
        const isUserMessage =
          updatedMessage.sender &&
          (updatedMessage.sender._id === userInfo.id ||
            updatedMessage.sender === userInfo.id);

        if (isUserMessage) {
          console.log(
            `🔔 This is your message being marked as ${updatedMessage.status}`
          );
        }

        // Update the messages state with a completely new array reference
        setSelectedChatMessages((prevMessages) => {
          if (!Array.isArray(prevMessages)) {
            console.error("❌ prevMessages is not an array");
            return prevMessages;
          }

          let messageFound = false;

          // Create a totally new array with updated message
          const updatedMessages = prevMessages.map((message) => {
            if (message._id === updatedMessage._id) {
              messageFound = true;
              console.log(
                `🔄 UI Update: Message ${message._id} status changing from ${message.status} to ${updatedMessage.status}`
              );

              // Create a completely new object with updated status and timestamp
              return {
                ...message,
                status: updatedMessage.status,
                _timestamp: Date.now(), // Add timestamp to force re-render
              };
            }
            return message;
          });

          if (!messageFound) {
            console.warn(
              `⚠️ Message ${updatedMessage._id} not found in current messages`
            );
          }

          console.log(
            `📊 Updated messages array with ${updatedMessages.length} items`
          );

          // Force a re-render with completely new array reference
          return [...updatedMessages];
        });
      };

      socket.on("message-status-update", handleMessageStatusUpdate);

      // Clean up listeners on unmount
      return () => {
        socket.off("message-status-update", handleMessageStatusUpdate);
      };
    }
  }, [socket, setSelectedChatMessages, userInfo.id]);

  useEffect(() => {
    const getMessages = async () => {
      const response = await apiClient.post(
        FETCH_ALL_MESSAGES_ROUTE,
        {
          id: selectedChatData._id,
        },
        { withCredentials: true }
      );

      if (response.data.messages) {
        setSelectedChatMessages(response.data.messages);

        // Mark messages as read when conversation is opened
        if (socket && selectedChatType === "contact") {
          // With simplified system: only look for messages with sent status
          const unreadMessages = response.data.messages.filter(
            (msg) => msg.sender._id !== userInfo.id && msg.status === "sent" // Only check for sent status
          );

          if (unreadMessages.length > 0) {
            console.log(
              `Marking ${unreadMessages.length} messages as read on chat open`
            );
            // Mark messages as read
            unreadMessages.forEach((msg) => {
              socket.emit("message-read", {
                messageId: msg._id,
                senderId: msg.sender._id,
              });
            });
          }
        }
      }
    };
    const getChannelMessages = async () => {
      const response = await apiClient.get(
        `${GET_CHANNEL_MESSAGES}/${selectedChatData._id}`,
        { withCredentials: true }
      );
      if (response.data.messages) {
        setSelectedChatMessages(response.data.messages);
      }
    };
    if (selectedChatData._id) {
      if (selectedChatType === "contact") getMessages();
      else if (selectedChatType === "channel") getChannelMessages();
    }
  }, [
    selectedChatData,
    selectedChatType,
    setSelectedChatMessages,
    socket,
    userInfo,
  ]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedChatMessages]);

  // Ensure images trigger scroll after loading
  const handleImageLoad = () => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const checkIfImage = (filePath) => {
    const imageRegex =
      /\.(jpg|jpeg|png|gif|bmp|tiff|tif|webp|svg|ico|heic|heif)$/i;
    return imageRegex.test(filePath);
  };

  const downloadFile = async (url) => {
    setIsDownloading(true);
    setDownloadProgress(0);
    const response = await apiClient.get(`${HOST}/${url}`, {
      responseType: "blob",
      onDownloadProgress: (progressEvent) => {
        const { loaded, total } = progressEvent;
        const percentCompleted = Math.round((loaded * 100) / total);
        setDownloadProgress(percentCompleted);
      },
    });
    const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = urlBlob;
    link.setAttribute("download", url.split("/").pop());
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(urlBlob);
    setIsDownloading(false);
    setDownloadProgress(0);
  };

  // Add this function to handle scrolling when audio controls appear
  const scrollToShowAudioControls = (messageId) => {
    setTimeout(() => {
      if (messageRefs.current[messageId]) {
        const messageElement = messageRefs.current[messageId];
        const containerElement = containerRef.current;

        // Calculate if the message is near the bottom
        const messageBottom = messageElement.getBoundingClientRect().bottom;
        const containerBottom = containerElement.getBoundingClientRect().bottom;

        // If the message is close to the bottom, scroll to ensure audio controls are visible
        if (containerBottom - messageBottom < 100) {
          containerElement.scrollTop += 100; // Scroll down to make room for controls
        }
      }
    }, 50); // Small delay to ensure DOM has updated
  };

  // Update the handleAudioPlay function to include scrolling
  const handleAudioPlay = (messageId, audioUrl) => {
    if (currentlyPlaying === messageId) {
      if (isPaused) {
        // Resume playback
        if (audioRef.current) {
          audioRef.current.play();
          setIsPaused(false);
        }
      } else {
        // Stop playback
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setCurrentlyPlaying(null);
        setIsPaused(false);
      }
    } else {
      // Start new playback
      setCurrentlyPlaying(messageId);
      setIsPaused(false);
      scrollToShowAudioControls(messageId);
    }
  };

  const togglePause = (e, messageId) => {
    e.stopPropagation();
    if (currentlyPlaying === messageId) {
      if (isPaused) {
        // Resume playback
        if (audioRef.current) {
          audioRef.current.play();
          setIsPaused(false);
        }
      } else {
        // Pause playback
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPaused(true);
        }
      }
    }
  };

  const downloadAudio = (e, audioUrl) => {
    e.preventDefault();
    e.stopPropagation();

    // Create a fetch request to get the audio file
    fetch(`${HOST}${audioUrl}`)
      .then((response) => response.blob())
      .then((blob) => {
        // Create a blob URL
        const blobUrl = window.URL.createObjectURL(blob);

        // Create a temporary link element
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = audioUrl.split("/").pop();

        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();

        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        }, 100);
      })
      .catch((error) => {
        console.error("Error downloading audio:", error);
      });
  };

  const renderMessages = () => {
    // Ensure selectedChatMessages is an array before attempting to map
    if (!Array.isArray(selectedChatMessages)) {
      console.warn(
        "selectedChatMessages is not an array",
        selectedChatMessages
      );
      return null;
    }

    // If it's an empty array, just return null
    if (selectedChatMessages.length === 0) {
      return null;
    }

    let lastDate = null;
    return selectedChatMessages.map((message, index) => {
      // Skip null messages
      if (!message) return null;

      const messageDate = moment(message.timestamp || new Date()).format(
        "YYYY-MM-DD"
      );
      const showDate = messageDate !== lastDate;
      lastDate = messageDate;

      // Safely access the sender
      const isCurrentUser =
        message.sender === userInfo.id ||
        (message.sender &&
          typeof message.sender === "object" &&
          message.sender._id === userInfo.id);

      // Determine if the message has long content
      const isLongContent = message.content && message.content.length > 100;

      // Use consistent identifiers for keys and refs
      const messageKey = `dm-msg-${index}-${message._id || index}`;
      const messageRefId = message._id || `msg-${index}`;

      return (
        <div
          key={messageKey}
          className=""
          ref={(el) => (messageRefs.current[messageRefId] = el)}
        >
          {showDate && (
            <div className="text-center text-gray-300 my-2">
              {moment(message.timestamp || new Date()).format("LL")}
            </div>
          )}
          <div className={`${isCurrentUser ? "text-right" : "text-left"}`}>
            {message.messageType === MESSAGE_TYPES.TEXT && (
              <div
                className={`${
                  isCurrentUser
                    ? "theme-primary-message"
                    : "theme-secondary-message"
                } border inline-block p-4 rounded my-1 ${
                  isLongContent
                    ? "w-full sm:w-auto max-w-[95%] sm:max-w-[80%] md:max-w-[60%]"
                    : "max-w-[85%] sm:max-w-[70%] md:max-w-[50%]"
                } break-words whitespace-pre-wrap overflow-visible relative`}
              >
                <div>{message.content}</div>
                {isCurrentUser && (
                  <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2">
                    <MessageStatus
                      status={message.status}
                      size="small"
                      className="scale-90 sm:scale-100"
                    />
                  </div>
                )}
              </div>
            )}
            {message.messageType === MESSAGE_TYPES.AUDIO && (
              <div
                className={`${
                  isCurrentUser
                    ? "theme-primary-message"
                    : "theme-secondary-message"
                } border inline-block p-4 rounded my-1 max-w-[85%] sm:max-w-[70%] md:max-w-[50%] break-words relative`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() =>
                      handleAudioPlay(messageRefId, message.audioUrl)
                    }
                    className={`hover:opacity-80 transition-colors flex-shrink-0`}
                  >
                    <IoVolumeHigh className="text-2xl" />
                  </button>
                  <p className={`text-xs`}>
                    Voice: {message.voiceName || "Default"}
                  </p>
                </div>
                <div
                  className={`text-sm whitespace-pre-wrap break-words overflow-visible w-full`}
                >
                  {message.content}
                </div>
                {currentlyPlaying === messageRefId && (
                  <div className="mt-2">
                    <audio
                      ref={audioRef}
                      src={`${HOST}${message.audioUrl}`}
                      autoPlay
                      className="hidden"
                      onEnded={() => {
                        setCurrentlyPlaying(null);
                        setIsPaused(false);
                      }}
                    />
                    <div className="flex items-center justify-center">
                      <button
                        onClick={(e) => togglePause(e, messageRefId)}
                        className="theme-primary-button rounded-full p-2 transition-all duration-300"
                      >
                        {isPaused ? (
                          <IoPlay className="h-5 w-5" />
                        ) : (
                          <IoPause className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={(e) => downloadAudio(e, message.audioUrl)}
                        className="ml-2 theme-primary-button rounded-full p-2 transition-all duration-300"
                      >
                        <IoMdArrowRoundDown className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
                {isCurrentUser && (
                  <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2">
                    <MessageStatus
                      status={message.status}
                      size="small"
                      className="scale-90 sm:scale-100"
                    />
                  </div>
                )}
              </div>
            )}
            {message.messageType === MESSAGE_TYPES.FILE && (
              <div
                className={`${
                  isCurrentUser
                    ? "theme-primary-message"
                    : "theme-secondary-message"
                } border inline-block p-3 rounded my-1 max-w-[85%] sm:max-w-[70%] md:max-w-[50%] break-words relative`}
              >
                <div>
                  {checkIfImage(message.fileUrl) ? (
                    <div
                      className="cursor-pointer relative"
                      onClick={() => {
                        setShowImage(true);
                        setImageURL(message.fileUrl);
                      }}
                    >
                      <img
                        src={`${HOST}/${message.fileUrl}`}
                        alt="Sent file"
                        className="max-h-64 max-w-full object-cover rounded"
                        onLoad={handleImageLoad}
                      />
                      {isCurrentUser && (
                        <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-black/60 px-0.5 py-0.5 sm:px-1.5 sm:py-0.5 rounded-md">
                          <MessageStatus
                            status={message.status}
                            size="small"
                            className="text-white scale-90 sm:scale-100"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-white/80 text-lg sm:text-xl bg-black/20 rounded-full p-1.5 sm:p-2 flex-shrink-0">
                          <MdFolderZip />
                        </span>
                        <span className="text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[150px] md:max-w-[200px]">
                          {message.fileUrl?.split("/").pop() || "Unknown File"}
                        </span>
                      </div>
                      <button
                        className="download-option bg-black/20 p-1.5 sm:p-2 text-lg sm:text-xl rounded-full hover:bg-black/50 cursor-pointer transition-all duration-300 flex-shrink-0 ml-2"
                        onClick={() => downloadFile(message.fileUrl)}
                        aria-label="Download file"
                      >
                        <IoMdArrowRoundDown />
                      </button>
                    </div>
                  )}
                </div>
                {isCurrentUser && !checkIfImage(message.fileUrl) && (
                  <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2">
                    <MessageStatus
                      status={message.status}
                      size="small"
                      className="scale-90 sm:scale-100"
                    />
                  </div>
                )}
              </div>
            )}
            {/* Remove the bottom profile display for channel messages */}
            <div
              className={`text-xs ${
                isCurrentUser ? "text-right" : "text-left"
              } ${theme === "dark" ? "text-gray-300" : "text-white/80"}`}
            >
              {moment(message.timestamp || new Date()).format("LT")}
            </div>
          </div>
        </div>
      );
    });
  };

  const renderChannelMessages = () => {
    // Check if selectedChatMessages is a valid array
    if (
      !Array.isArray(selectedChatMessages) ||
      selectedChatMessages.length === 0
    ) {
      return null;
    }

    let lastDate = null; // Track the last displayed date

    return selectedChatMessages.map((message, index) => {
      // Skip null or undefined messages
      if (!message) return null;

      // Safely access message properties with fallbacks
      const messageDate = moment(message.timestamp || new Date()).format(
        "YYYY-MM-DD"
      );
      const showDate = messageDate !== lastDate;
      lastDate = messageDate;

      // Fix: Safely check sender properties
      const senderID = message.sender
        ? typeof message.sender === "object"
          ? message.sender._id
          : message.sender
        : null;
      const isSender = senderID === userInfo.id;

      // Define isCurrentUser based on senderID
      const isCurrentUser = senderID === userInfo.id;

      // Determine if the message has long content
      const isLongContent = message.content && message.content.length > 100;

      const messageKey = `channel-msg-${index}-${message._id || index}`;
      const messageRefId = message._id || `msg-${index}`;

      return (
        <div
          key={messageKey}
          className="mt-5"
          ref={(el) => (messageRefs.current[messageRefId] = el)}
        >
          {showDate && (
            <div className="text-center text-white my-2">
              {moment(message.timestamp || new Date()).format("LL")}
            </div>
          )}
          <div className={`${isSender ? "text-right" : "text-left"}`}>
            {!isSender &&
              message.sender &&
              typeof message.sender === "object" && (
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-8 w-8">
                    {message.sender.image && (
                      <AvatarImage
                        src={`${HOST}/${message.sender.image}`}
                        alt="profile"
                        className="rounded-full"
                      />
                    )}
                    <AvatarFallback
                      className={`uppercase h-8 w-8 flex ${getColor(
                        message.sender.color || "default"
                      )} items-center justify-center rounded-full`}
                    >
                      {message.sender.firstName?.split("").shift() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-white/60">
                    {`${message.sender.firstName || ""} ${
                      message.sender.lastName || ""
                    }`}
                  </span>
                </div>
              )}

            {message.messageType === MESSAGE_TYPES.TEXT && (
              <div
                className={`${
                  isSender ? "theme-primary-message" : "theme-secondary-message"
                } border inline-block p-4 rounded my-1 ${
                  isLongContent
                    ? "w-full sm:w-auto max-w-[95%] sm:max-w-[80%] md:max-w-[60%]"
                    : "max-w-[85%] sm:max-w-[70%] md:max-w-[50%]"
                } break-words whitespace-pre-wrap overflow-visible relative`}
              >
                <div>{message.content}</div>
                {isCurrentUser && (
                  <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2">
                    <MessageStatus
                      status={message.status}
                      size="small"
                      className="scale-90 sm:scale-100"
                    />
                  </div>
                )}
              </div>
            )}
            {message.messageType === MESSAGE_TYPES.AUDIO && (
              <div
                className={`${
                  isSender ? "theme-primary-message" : "theme-secondary-message"
                } border inline-block p-4 rounded my-1 max-w-[85%] sm:max-w-[70%] md:max-w-[50%] break-words relative`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() =>
                      handleAudioPlay(messageRefId, message.audioUrl)
                    }
                    className={`hover:opacity-80 transition-colors flex-shrink-0`}
                  >
                    <IoVolumeHigh className="text-2xl" />
                  </button>
                  <p className={`text-xs`}>
                    Voice: {message.voiceName || "Default"}
                  </p>
                </div>
                <div
                  className={`text-sm whitespace-pre-wrap break-words overflow-visible w-full`}
                >
                  {message.content}
                </div>
                {currentlyPlaying === messageRefId && (
                  <div className="mt-2">
                    <audio
                      ref={audioRef}
                      src={`${HOST}${message.audioUrl}`}
                      autoPlay
                      className="hidden"
                      onEnded={() => {
                        setCurrentlyPlaying(null);
                        setIsPaused(false);
                      }}
                    />
                    <div className="flex items-center justify-center">
                      <button
                        onClick={(e) => togglePause(e, messageRefId)}
                        className="theme-primary-button rounded-full p-2 transition-all duration-300"
                      >
                        {isPaused ? (
                          <IoPlay className="h-5 w-5" />
                        ) : (
                          <IoPause className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={(e) => downloadAudio(e, message.audioUrl)}
                        className="ml-2 theme-primary-button rounded-full p-2 transition-all duration-300"
                      >
                        <IoMdArrowRoundDown className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
                {isCurrentUser && (
                  <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2">
                    <MessageStatus
                      status={message.status}
                      size="small"
                      className="scale-90 sm:scale-100"
                    />
                  </div>
                )}
              </div>
            )}
            {message.messageType === MESSAGE_TYPES.FILE && (
              <div
                className={`${
                  isSender ? "theme-primary-message" : "theme-secondary-message"
                } border inline-block p-3 rounded my-1 max-w-[85%] sm:max-w-[70%] md:max-w-[50%] break-words relative`}
              >
                <div>
                  {checkIfImage(message.fileUrl) ? (
                    <div
                      className="cursor-pointer relative"
                      onClick={() => {
                        setShowImage(true);
                        setImageURL(message.fileUrl);
                      }}
                    >
                      <img
                        src={`${HOST}/${message.fileUrl}`}
                        alt="Sent file"
                        className="max-h-64 max-w-full object-cover rounded"
                        onLoad={handleImageLoad}
                      />
                      {isCurrentUser && (
                        <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-black/60 px-0.5 py-0.5 sm:px-1.5 sm:py-0.5 rounded-md">
                          <MessageStatus
                            status={message.status}
                            size="small"
                            className="text-white scale-90 sm:scale-100"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-white/80 text-lg sm:text-xl bg-black/20 rounded-full p-1.5 sm:p-2 flex-shrink-0">
                          <MdFolderZip />
                        </span>
                        <span className="text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[150px] md:max-w-[200px]">
                          {message.fileUrl?.split("/").pop() || "Unknown File"}
                        </span>
                      </div>
                      <button
                        className="download-option bg-black/20 p-1.5 sm:p-2 text-lg sm:text-xl rounded-full hover:bg-black/50 cursor-pointer transition-all duration-300 flex-shrink-0 ml-2"
                        onClick={() => downloadFile(message.fileUrl)}
                        aria-label="Download file"
                      >
                        <IoMdArrowRoundDown />
                      </button>
                    </div>
                  )}
                </div>
                {isCurrentUser && !checkIfImage(message.fileUrl) && (
                  <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2">
                    <MessageStatus
                      status={message.status}
                      size="small"
                      className="scale-90 sm:scale-100"
                    />
                  </div>
                )}
              </div>
            )}

            <div
              className={`text-xs ${
                isSender ? "text-right" : "text-left"
              } text-white`}
            >
              {moment(message.timestamp || new Date()).format("LT")}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-y-auto p-4 px-8 md:w-[65vw] lg:w-[70vw] xl:w-[80vw] w-full ${
        theme === "dark" ? "text-white" : "text-black"
      } custom-scrollbar`}
      style={{
        maxHeight: "calc(100vh - 10vh - 4rem)",
        height: "calc(100vh - 10vh - 4rem)",
        minHeight: "calc(100vh - 10vh - 4rem)",
        paddingBottom: "80px", // Add padding to ensure messages aren't hidden behind the message bar
      }}
    >
      {selectedChatType === "channel"
        ? renderChannelMessages()
        : renderMessages()}
      <div ref={messageEndRef} />
      {showImage && (
        <div className="fixed z-[1000] top-0 left-0 h-[100vh] w-[100vw] flex items-center justify-center backdrop-blur-lg flex-col">
          <div className="relative">
            <img
              src={`${HOST}/${imageURL}`}
              className="h-[80vh] w-full bg-cover"
              alt=""
            />
            {selectedChatType === "contact" &&
              selectedChatMessages.some(
                (msg) => msg.fileUrl === imageURL && msg.sender === userInfo.id
              ) && (
                <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 bg-black/60 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md">
                  <MessageStatus
                    status={
                      selectedChatMessages.find(
                        (msg) => msg.fileUrl === imageURL
                      )?.status
                    }
                    size="large"
                    className="text-white"
                  />
                </div>
              )}
          </div>
          <div className="flex gap-5 fixed top-0 mt-5">
            <button
              className="bg-black/20 p-3 text-2xl rounded-full hover:bg-black/50 cursor-pointer transition-all duration-300 text-white"
              onClick={() => downloadFile(imageURL)}
            >
              <IoMdArrowRoundDown />
            </button>
            <button
              className="bg-black/20 p-3 text-2xl rounded-full hover:bg-black/50 cursor-pointer transition-all duration-300 text-white"
              onClick={() => {
                setShowImage(false);
                setImageURL(null);
              }}
            >
              <IoCloseSharp />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageContainer;
