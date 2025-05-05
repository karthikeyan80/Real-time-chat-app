import { useState, useRef, useEffect } from "react";
import { useTheme } from "../../../contexts/ThemeContext";
import "../../../styles/theme.css";

const ThemeSwitcher = () => {
  const { theme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const themeColors = {
    default: "bg-purple-600",
    dark: "bg-purple-500",
    cyberpunk: "bg-cyan-600",
    forest: "bg-green-600",
    ocean: "bg-blue-600",
    sunset: "bg-orange-600",
  };

  return (
    <div className="theme-switcher relative flex items-center" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center bg-transparent hover:bg-black/10 rounded-full p-1 transition-all duration-300"
        aria-label="Theme switcher"
      >
        <img 
          src="/brush.png" 
          alt="Theme" 
          className="theme-icon filter hue-rotate-[330deg] w-5 h-5 md:w-6 md:h-6"
        />
      </button>

      {isOpen && (
        <div className="theme-dropdown absolute right-0 top-full mt-2 p-2 bg-[#1b1c24] rounded-lg shadow-lg border border-gray-700 z-50 min-w-[180px] backdrop-blur-sm bg-opacity-95 animate-fadeIn">
          <div className="grid grid-cols-1 gap-1">
            {themes.map((themeName) => (
              <button
                key={themeName}
                onClick={() => {
                  setTheme(themeName);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-white/80 hover:bg-black/20 rounded-lg transition-colors ${
                  theme === themeName ? "bg-black/30 text-white" : ""
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${themeColors[themeName]}`} />
                <span className="capitalize">{themeName}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;
