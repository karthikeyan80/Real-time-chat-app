import React, { memo, useEffect, useState } from "react";
import { TiTick } from "react-icons/ti";
import { TiTickOutline } from "react-icons/ti";
import { BiCheck, BiCheckDouble } from "react-icons/bi";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Message status component that displays appropriate icons
 * based on message status:
 * - Single tick for sent messages
 * - Double tick for read messages
 */
const MessageStatus = ({ status, className = "", size = "small" }) => {
  // Add a state to force re-render when status changes
  const [currentStatus, setCurrentStatus] = useState(status);
  const [renderKey, setRenderKey] = useState(Date.now());

  // Update internal state when prop changes
  useEffect(() => {
    if (status !== currentStatus) {
      console.log(
        `🔄 MessageStatus: Status changed from ${currentStatus} to ${status}`
      );
      setCurrentStatus(status);
      // Force re-render with a new key
      setRenderKey(Date.now());
    }
  }, [status, currentStatus]);

  if (!currentStatus) return null;

  // Get current theme
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";

  // Size classes for different contexts with responsive options
  const sizeClasses = {
    small: "text-xs sm:text-sm",
    medium: "text-sm sm:text-base",
    large: "text-base sm:text-lg",
  };

  // Icon sizes in pixels with responsive options
  const iconSizes = {
    small: { base: 16, sm: 18 },
    medium: { base: 18, sm: 22 },
    large: { base: 22, sm: 26 },
  };

  // Default to small if size prop is invalid
  const sizeClass = sizeClasses[size] || sizeClasses.small;
  const iconSize = iconSizes[size]?.base || iconSizes.small.base;

  // Use CSS media query to determine icon size (can't be done inline with React Icons)
  const getIconStyle = () => {
    return {
      strokeWidth: 1.5,
    };
  };

  // Theme-specific colors - white on dark theme, black on all others
  const sentColor = isDarkTheme ? "text-gray-400" : "text-gray-600";
  const readColor = isDarkTheme ? "text-white" : "text-black";

  // Check if text-white is explicitly specified in the className
  const hasWhiteColorClass = className.includes("text-white");
  const finalSentColor = hasWhiteColorClass ? "text-white" : sentColor;
  const finalReadColor = hasWhiteColorClass ? "text-white" : readColor;

  // Treat "delivered" status as "sent" to only show single tick
  const displayStatus = currentStatus === "delivered" ? "sent" : currentStatus;

  return (
    <div
      key={renderKey}
      className={`message-status inline-flex ${sizeClass} ${className}`}
      data-status={displayStatus}
    >
      {displayStatus === "sent" && (
        <BiCheck
          size={iconSize}
          className={finalSentColor}
          title="Sent"
          style={getIconStyle()}
        />
      )}
      {displayStatus === "read" && (
        <BiCheckDouble
          size={iconSize}
          className={finalReadColor}
          title="Read"
          style={getIconStyle()}
        />
      )}
    </div>
  );
};

// Use memo to prevent unnecessary re-renders
export default memo(MessageStatus);
