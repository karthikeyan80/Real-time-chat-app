import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext({
  theme: "default",
  setTheme: () => {},
  themes: ["default", "dark", "cyan", "green", "blue", "sunset"],
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme || "default";
  });

  // Preload all theme background images to ensure smooth transitions
  useEffect(() => {
    const themes = ["default", "dark", "cyan", "green", "blue", "sunset"];
    const imageMap = {
      default: "/purple.jpg",
      dark: "/dark.jpg",
      cyan: "/cyberpunk.jpg",
      green: "/forest.jpg",
      blue: "/ocean.jpg",
      sunset: "/sunset.jpg",
    };

    // Preload all images
    themes.forEach((themeName) => {
      const img = new Image();
      img.src = imageMap[themeName];
    });
  }, []);

  // Add this to the useEffect in ThemeContext.jsx where theme changes are handled
  useEffect(() => {
    // Save theme preference
    localStorage.setItem("theme", theme);

    // Apply theme to document without affecting real-time functionality
    document.documentElement.setAttribute("data-theme", theme);

    // Update body classes for dark mode
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Define theme colors
    const themeColors = {
      default: {
        primary: "#9333ea", // purple-600
        primaryLight: "#f3e8ff", // purple-100
        primaryDark: "#7e22ce", // purple-700
        mainBackground: "#1c1d25", // default dark background
        background: "#f8f9fa", // light gray
        backgroundSecondary: "#ffffff", // white
        text: "#1a1a1a", // dark gray
      },
      dark: {
        primary: "#1e293b", // slate-800
        primaryLight: "#334155", // slate-700
        primaryDark: "#0f172a", // slate-900
        mainBackground: "#0f172a", // slate-900
        background: "#0f172a", // slate-900
        backgroundSecondary: "#1e293b", // slate-800
        text: "#ffffff", // slate-50
      },
      cyan: {
        primary: "#06b6d4", // cyan-500
        primaryLight: "#22d3ee", // cyan-400
        primaryDark: "#0891b2", // cyan-600
        mainBackground: "cyana-900", // cyan-900
        background: "#0c4a6e", // cyan-900
        backgroundSecondary: "#164e63", // cyan-800
        text: "#e0f2fe", // cyan-50
      },
      green: {
        primary: "#16a34a", // green-600
        primaryLight: "#22c55e", // green-500
        primaryDark: "#15803d", // green-700
        mainBackground: "#052e16", // green-900
        background: "#052e16", // green-900
        backgroundSecondary: "#064e3b", // green-800
        text: "#f0fdf4", // green-50
      },
      blue: {
        primary: "#2563eb", // blue-600
        primaryLight: "#3b82f6", // blue-500
        primaryDark: "#1d4ed8", // blue-700
        mainBackground: "#172554", // blue-900
        background: "#172554", // blue-900
        backgroundSecondary: "#1e3a8a", // blue-800
        text: "#eff6ff", // blue-50
      },
      sunset: {
        primary: "#ea580c", // orange-600
        primaryLight: "#f97316", // orange-500
        primaryDark: "#c2410c", // orange-700
        mainBackground: "#7c2d12", // orange-900
        background: "#7c2d12", // orange-900
        backgroundSecondary: "#9a3412", // orange-800
        text: "#fff7ed", // orange-50
      },
    };

    // Apply theme colors to CSS variables with a consistent transition
    const root = document.documentElement;
    const colors = themeColors[theme] || themeColors.default; // Fallback to default theme

    // Ensure smooth transitions by applying all changes in a single batch
    requestAnimationFrame(() => {
      // Set CSS variables for theme colors
      root.style.setProperty("--primary", colors.primary);
      root.style.setProperty("--primary-light", colors.primaryLight);
      root.style.setProperty("--primary-dark", colors.primaryDark);
      root.style.setProperty("--main-background", colors.mainBackground);
      root.style.setProperty("--background", colors.background);
      root.style.setProperty(
        "--background-secondary",
        colors.backgroundSecondary
      );
      root.style.setProperty("--text", colors.text);
    });

    // Add theme class for additional styling
    const themeClasses = [
      "theme-default",
      "theme-dark",
      "theme-cyan",
      "theme-green",
      "theme-blue",
      "theme-sunset",
    ];
    themeClasses.forEach((className) => {
      document.documentElement.classList.remove(className);
    });
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme]);

  const themes = ["default", "dark", "cyan", "green", "blue", "sunset"];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
