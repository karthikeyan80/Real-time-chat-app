import axios from "axios";
import { HOST } from "./constants.js";

const apiClient = axios.create({
  baseURL: HOST,
  withCredentials: true, // Enable sending cookies with requests
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log the error for debugging
    console.error("API Error:", error.response?.status, error.response?.data);

    if (
      error.response?.status === 401 &&
      !window.location.pathname.includes("/auth")
    ) {
      // Redirect to login page on authentication error, but only if not already on auth page
      console.log("Authentication error, redirecting to login page");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
