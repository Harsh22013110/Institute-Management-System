const jwt = require("jsonwebtoken");

/**
 * Generate a JWT token for room QR code
 * @param {String} roomId - Room ID
 * @returns {String} JWT token
 */
const generateRoomQRToken = (roomId) => {
  const payload = {
    roomId,
    type: "room",
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "365d", // QR codes should be valid for a long time
  });
};

/**
 * Verify and decode room QR token
 * @param {String} token - JWT token
 * @param {String} expectedRoomId - Expected room ID to validate against
 * @returns {Object|null} Decoded token or null if invalid
 */
const verifyRoomQRToken = (token, expectedRoomId) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validate token type
    if (decoded.type !== "room") {
      return null;
    }

    // Validate room ID matches
    if (decoded.roomId !== expectedRoomId) {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error("QR token verification error:", error);
    return null;
  }
};

module.exports = {
  generateRoomQRToken,
  verifyRoomQRToken,
};

