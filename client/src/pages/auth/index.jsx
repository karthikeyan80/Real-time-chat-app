import neonBG from "@/assets/neonBG.jpg";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api-client";
import { LOGIN_ROUTE, SIGNUP_ROUTE } from "@/lib/constants";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";

const Auth = () => {
  const navigate = useNavigate();
  const { setUserInfo } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const validateLogin = () => {
    if (!email.length) {
      toast.error("Email is required.");
      return false;
    }
    if (!password.length) {
      toast.error("Password is required.");
      return false;
    }
    return true;
  };

  const validateSignup = () => {
    if (!email.length) {
      toast.error("Email is required.");
      return false;
    }
    if (!password.length) {
      toast.error("Password is required.");
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("Password and Confirm Password should match.");
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    try {
      if (validateLogin()) {
        const response = await apiClient.post(
          LOGIN_ROUTE,
          { email, password },
          { withCredentials: true }
        );
        if (response.data.user.id) {
          setUserInfo(response.data.user);
          if (response.data.user.profileSetup) navigate("/chat");
          else navigate("/profile");
        }
      }
    } catch (error) {
      console.log(error);
      toast.error("Login failed. Check your credentials.");
    }
  };

  const handleSignup = async () => {
    try {
      if (validateSignup()) {
        const response = await apiClient.post(
          SIGNUP_ROUTE,
          { email, password },
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

  return (
    <div
      className="h-screen w-screen flex items-center justify-center p-4 bg-[#1a1a1d]"
      style={{ backgroundImage: `url(${neonBG})`, backgroundSize: "cover" }}
    >
      <div className="w-full max-w-xl bg-black bg-opacity-80 border border-gray-700 shadow-2xl p-10 md:p-14 backdrop-blur-xl rounded-3xl">
        <h1 className="text-center text-white text-4xl font-bold mb-6">Welcome</h1>
        <p className="text-center text-white mb-10">Please login or signup to continue</p>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="flex w-full mb-8 bg-transparent border-b border-gray-600">
            <TabsTrigger
              value="login"
              className="w-1/2 text-center text-lg border-b-2 border-transparent data-[state=active]:border-[#8417ff] data-[state=active]:text-[#8417ff] text-white"
            >
              Login
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="w-1/2 text-center text-lg border-b-2 border-transparent data-[state=active]:border-[#8417ff] data-[state=active]:text-[#8417ff] text-white"
            >
              Signup
            </TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="flex flex-col gap-6">
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#1f1f23] text-white p-6 rounded-lg"
            />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#1f1f23] text-white p-6 rounded-lg"
            />
            <Button
              onClick={handleLogin}
              className="w-full bg-[#8417ff] text-white p-6 rounded-3xl mt-6 text-lg"
            >
              Login
            </Button>
          </TabsContent>
          <TabsContent value="signup" className="flex flex-col gap-6">
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#1f1f23] text-white p-6 rounded-lg"
            />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
      </div>
    </div>
  );
};

export default Auth;
