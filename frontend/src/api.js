import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_APILINK,
  timeout: 30000, // 30 second timeout (increased for LAN connections)
  withCredentials: true,
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors and timeouts
    if (!error.response) {
      if (error.code === "ECONNABORTED") {
        console.error("Request timeout - server may be down or slow");
      } else if (error.message === "Network Error") {
        console.error("Network Error - Check if backend server is running");
      }
    }
    return Promise.reject(error);
  }
);

export default api;


