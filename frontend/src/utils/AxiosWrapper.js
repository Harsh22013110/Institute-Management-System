import axios from "axios";
import { baseApiURL } from "../baseUrl";

const baseURL = baseApiURL();

const axiosWrapper = axios.create({
  baseURL: baseURL,
  timeout: 30000, // 30 second timeout (increased for LAN connections)
  withCredentials: true, // Enable cookies
  headers: {
    "Content-Type": "application/json",
  },
});

axiosWrapper.interceptors.request.use(
  (config) => {
    // Attach Bearer token from localStorage if present (fallback for cookie)
    // Cookie takes precedence on server side
    const token = localStorage.getItem("userToken");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosWrapper.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      console.error("Network Error:", error.message);
      if (error.code === "ECONNABORTED") {
        console.error("Request timeout - server may be down or slow");
      } else if (error.message === "Network Error") {
        console.error("Network Error - Check if backend server is running");
      }
    }
    
    if (
      error.response?.data?.message === "Invalid or expired token" &&
      error.response?.data?.success === false &&
      error.response?.data?.data === null
    ) {
      localStorage.clear();
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default axiosWrapper;
