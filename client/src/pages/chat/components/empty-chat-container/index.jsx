import LottieAnimation from "@/components/common/lottie-animation";
import { useTheme } from "@/contexts/ThemeContext";
import { useEffect } from "react";

const EmptyChatContainer = () => {
  const { theme } = useTheme();

  return (
    <div
      className="flex-1 md:flex flex-col justify-center items-center hidden bg-[#1b1c24] duration-300 transition-all bg-cover bg-center bg-no-repeat"
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
      }}
    >
      {/* <div className="flex flex-col items-center bg-black/60 p-10 rounded-xl backdrop-blur-16xl"> */}
        <LottieAnimation />
        <div className="text-opacity-80 text-white flex flex-col gap-5 items-center mt-10 lg:text-4xl text-3xl transition-all duration-1000 text-center">
          <h3 className="poppins-medium">
            Hi
            <span className="text-purple-500">!</span> Welcome to
            <span className="text-purple-500"> Chatify </span>
            App<span className="text-purple-500">.</span>
          </h3>
        </div>
      </div>
    // </div>
  );
};

export default EmptyChatContainer;
