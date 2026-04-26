const resolveRoom = require("../utils/resolve-room");
const { getRoomFieldName } = require("../utils/roomField");
const ApiResponse = require("../utils/ApiResponse");

/**
 * GET /api/debug/room-lookup/:key
 * Debug endpoint to test room lookup (admin only)
 * Returns which field was used and whether room was found
 */
const debugRoomLookupController = async (req, res) => {
  try {
    const { key } = req.params;
    const field = getRoomFieldName();
    
    const room = await resolveRoom(key);
    
    if (room) {
      const value = room[field];
      return res.json({
        key,
        fieldUsed: field,
        found: true,
        value: value,
        roomNumber: room.roomNumber,
        _id: room._id,
      });
    } else {
      return res.json({
        key,
        fieldUsed: field,
        found: false,
        value: null,
      });
    }
  } catch (error) {
    console.error("Debug room lookup error:", error);
    return ApiResponse.internalServerError(error.message).send(res);
  }
};

module.exports = { debugRoomLookupController };


