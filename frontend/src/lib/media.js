const MEDIA = process.env.REACT_APP_MEDIALINK || process.env.REACT_APP_MEDIA_LINK || "http://10.148.86.146:4000/media";

export function mediaUrl(p = "") {
  const clean = String(p).replace(/^\/+/, "");
  return `${MEDIA}/${encodeURI(clean)}`;
}

