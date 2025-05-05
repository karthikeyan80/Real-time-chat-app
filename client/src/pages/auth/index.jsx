import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api-client";
import { LOGIN_ROUTE, SIGNUP_ROUTE } from "@/lib/constants";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";
import { SyncLoader } from "react-spinners";

const Auth = () => {
  const navigate = useNavigate();
  const { setUserInfo } = useAppStore();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPageReady, setIsPageReady] = useState(false);
  const [typingUser, setTypingUser] = useState(null);

  useEffect(() => {
    // Handle initial page load and refreshes
    const handleLoad = () => {
      setIsLoading(true);
      // Simulate loading time for background and components
      const timer = setTimeout(() => {
        setIsLoading(false);
        setIsPageReady(true);
      }, 1500);
      return timer;
    };

    const timer = handleLoad();
    return () => clearTimeout(timer);
  }, []);

  const validateLogin = () => {
    if (!loginEmail.length) {
      toast.error("Email is required.");
      return false;
    }
    if (!loginPassword.length) {
      toast.error("Password is required.");
      return false;
    }
    return true;
  };

  const validateSignup = () => {
    if (!signupEmail.length) {
      toast.error("Email is required.");
      return false;
    }
    if (!signupPassword.length) {
      toast.error("Password is required.");
      return false;
    }
    if (signupPassword !== confirmPassword) {
      toast.error("Password and Confirm Password should match.");
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    try {
      if (validateLogin()) {
        console.log("Attempting login with:", loginEmail);
        const response = await apiClient.post(
          LOGIN_ROUTE,
          { email: loginEmail, password: loginPassword },
          { withCredentials: true }
        );
        console.log("Login response:", response.status, response.data);

        if (response.data.user && response.data.user.id) {
          setUserInfo(response.data.user);
          if (response.data.user.profileSetup) navigate("/chat");
          else navigate("/profile");
        } else {
          toast.error("Login failed. Invalid response from server.");
        }
      }
    } catch (error) {
      console.error(
        "Login error:",
        error.response?.status,
        error.response?.data
      );

      if (error.response?.status === 404) {
        toast.error("User not found. Please check your email.");
      } else if (error.response?.status === 400) {
        toast.error("Invalid password. Please try again.");
      } else {
        toast.error(`Login failed: ${error.response?.data || "Unknown error"}`);
      }
    }
  };

  const handleSignup = async () => {
    try {
      if (validateSignup()) {
        const response = await apiClient.post(
          SIGNUP_ROUTE,
          { email: signupEmail, password: signupPassword },
          { withCredentials: true }
        );
        if (response.status === 201) {
          setUserInfo(response.data.user);
          navigate("/profile");
        }
      }
    } catch (error) {
      console.log(error);
      toast.error("Signup failed. Please try again.");
    }
  };

  const handleTyping = (userId) => {
    setTypingUser(userId);
  };

  if (!isPageReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#2d1b4e] to-[#1a1a2e]">
        <div className="flex flex-col items-center justify-center">
          <SyncLoader color="#8417ff" size={15} margin={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#1a1a2e] via-[#2d1b4e] to-[#1a1a2e]">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center">
          <SyncLoader color="#8417ff" size={15} margin={5} />
        </div>
      ) : (
        <div className="w-full max-w-xl bg-black bg-opacity-50 border border-gray-700 shadow-2xl p-10 md:p-14 backdrop-blur-sm rounded-3xl transition-all duration-500 ease-in-out transform scale-100 opacity-100 animate-fadeIn">
          <h1 className="text-center text-white text-4xl font-bold mb-6">
            Welcome
          </h1>
          <p className="text-center text-white mb-10">
            Please login or signup to continue
          </p>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="flex w-full mb-8 bg-transparent border-b border-gray-600">
              <TabsTrigger
                value="login"
                className="w-1/2 text-center text-lg border-b-2 border-transparent data-[state=active]:border-[#8417ff] data-[state=active]:text-[#8417ff] text-white transition-all duration-300"
              >
                Login
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="w-1/2 text-center text-lg border-b-2 border-transparent data-[state=active]:border-[#8417ff] data-[state=active]:text-[#8417ff] text-white transition-all duration-300"
              >
                Signup
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="login"
              className="flex flex-col gap-6 transition-all duration-300 ease-in-out transform data-[state=inactive]:opacity-0 data-[state=inactive]:scale-95 data-[state=active]:opacity-100 data-[state=active]:scale-100"
            >
              <Input
                placeholder="Email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="bg-[#1f1f23] text-white p-6 rounded-lg"
              />
              <Input
                placeholder="Password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="bg-[#1f1f23] text-white p-6 rounded-lg"
              />
              <Button
                onClick={handleLogin}
                className="w-full bg-[#8417ff] text-white p-6 rounded-3xl mt-6 text-lg"
              >
                Login
              </Button>
            </TabsContent>
            <TabsContent
              value="signup"
              className="flex flex-col gap-6 transition-all duration-300 ease-in-out transform data-[state=inactive]:opacity-0 data-[state=inactive]:scale-95 data-[state=active]:opacity-100 data-[state=active]:scale-100"
            >
              <Input
                placeholder="Email"
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="bg-[#1f1f23] text-white p-6 rounded-lg"
              />
              <Input
                placeholder="Password"
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                className="bg-[#1f1f23] text-white p-6 rounded-lg"
              />
              <Input
                placeholder="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-[#1f1f23] text-white p-6 rounded-lg"
              />
              <Button
                onClick={handleSignup}
                className="w-full bg-[#8417ff] text-white p-6 rounded-3xl mt-6 text-lg"
              >
                Signup
              </Button>
            </TabsContent>
          </Tabs>
          {typingUser && <p>{`${typingUser} is typing...`}</p>}
        </div>
      )}
    </div>
  );
};

export default Auth;
