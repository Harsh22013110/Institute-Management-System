export const baseApiURL = () => {
  return process.env.REACT_APP_APILINK || "http://10.148.86.146:4000/api";
};

export const baseMediaURL = () => {
  // Support both REACT_APP_MEDIALINK and REACT_APP_MEDIA_LINK for backward compatibility
  return process.env.REACT_APP_MEDIALINK || process.env.REACT_APP_MEDIA_LINK || "http://10.148.86.146:4000/media";
};
