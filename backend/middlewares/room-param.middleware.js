const resolveRoom = require("../utils/resolve-room");
const { getRoomFieldName } = require("../utils/roomField");

/**
 * Router param middleware to load room by roomNumber or ObjectId
 * Sets req.room and req.roomNumber for use in route handlers
 * 
 * Usage: router.param("roomKey", loadRoomByKey);
 * Then routes can use :roomKey and access req.room and req.roomNumber
 */
async function loadRoomByKey(req, res, next, roomKey) {
  try {
    if (!roomKey) {
      return res.status(400).json({
        success: false,
        message: "Room key is required",
      });
    }

    const room = await resolveRoom(roomKey);
    if (!room) {
      // Guard: don't log 404 for bulk QR requests (this middleware shouldn't even run for bulk, but just in case)
      if (!req.originalUrl || !req.originalUrl.includes("/rooms/qr/bulk")) {
        // Only return 404 if this is not a bulk request
        return res.status(404).json({
          success: false,
          message: "Room not found",
        });
      }
      // For bulk requests, this shouldn't happen, but if it does, just continue
      return next();
    }

    req.room = room;
    
    // Support both numeric and string room fields - try multiple field names
    const field = getRoomFieldName();
    const roomValue = room[field] ?? room.room_no ?? room.room ?? room.number ?? room.roomNo ?? room.roomNum ?? roomKey;
    
    // Try to convert to number
    req.roomNumber = Number(roomValue);
    if (Number.isNaN(req.roomNumber)) {
      // Try string-to-number conversion
      const n = Number(String(roomValue));
      if (!Number.isNaN(n)) {
        req.roomNumber = n;
      } else {
        // Last resort: try parsing the roomKey itself
        req.roomNumber = Number(roomKey);
        if (Number.isNaN(req.roomNumber)) {
          // Guard: don't log for bulk QR requests
          if (!req.originalUrl || !req.originalUrl.includes("/rooms/qr/bulk")) {
            console.warn(`Could not determine numeric roomNumber for key: ${roomKey}, using as-is`);
          }
          req.roomNumber = roomValue;
        }
      }
    }

    return next();
  } catch (error) {
    console.error("Error loading room by key:", error);
    return res.status(500).json({
      success: false,
      message: "Error loading room",
    });
  }
}

module.exports = loadRoomByKey;

