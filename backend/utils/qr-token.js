const jwt = require("jsonwebtoken");

/**
 * Generate a JWT token for room QR code
 * @param {Number} roomNumber - Room number (e.g., 401)
 * @returns {String} JWT token
 */
const generateRoomQRToken = (roomNumber) => {
  const payload = {
    roomId: typeof roomNumber === "number" ? roomNumber : parseInt(roomNumber, 10),
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
 * @param {Number|String} expectedRoomNumber - Expected room number to validate against
 * @returns {Object|null} Decoded token or null if invalid
 */
const verifyRoomQRToken = (token, expectedRoomNumber) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validate token type
    if (decoded.type !== "room") {
      return null;
    }

    // Convert expectedRoomNumber to Number for comparison
    const expectedNum = typeof expectedRoomNumber === "number" 
      ? expectedRoomNumber 
      : parseInt(expectedRoomNumber, 10);
    const tokenRoomNum = typeof decoded.roomId === "number" 
      ? decoded.roomId 
      : parseInt(decoded.roomId, 10);

    // Validate room number matches
    if (tokenRoomNum !== expectedNum) {
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

