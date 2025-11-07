const RoomScanLog = require("../models/room-scan-log.model");

/**
 * Compute occupancy status for a room
 * @param {String} roomId - Room ID
 * @param {Date} now - Current time (defaults to now)
 * @returns {Promise<{status: string, occupiedUntil: Date|null}>}
 */
const computeRoomOccupancy = async (roomId, now = new Date()) => {
  try {
    // Find the most recent non-expired scan
    const activeScan = await RoomScanLog.findOne({
      roomId,
      expiresAt: { $gt: now },
    }).sort({ expiresAt: -1 });

    if (activeScan) {
      return {
        status: "Occupied",
        occupiedUntil: activeScan.expiresAt,
      };
    }

    return {
      status: "Available",
      occupiedUntil: null,
    };
  } catch (error) {
    console.error("Error computing room occupancy:", error);
    return {
      status: "Available",
      occupiedUntil: null,
    };
  }
};

/**
 * Compute occupancy for multiple rooms
 * @param {Array<String>} roomIds - Array of room IDs
 * @param {Date} now - Current time
 * @returns {Promise<Map<String, {status: string, occupiedUntil: Date|null}>>}
 */
const computeMultipleRoomOccupancy = async (roomIds, now = new Date()) => {
  try {
    const activeScans = await RoomScanLog.find({
      roomId: { $in: roomIds },
      expiresAt: { $gt: now },
    })
      .sort({ expiresAt: -1 })
      .lean();

    const occupancyMap = new Map();

    // Initialize all rooms as Available
    roomIds.forEach((id) => {
      occupancyMap.set(id.toString(), {
        status: "Available",
        occupiedUntil: null,
      });
    });

    // Update with active scans
    activeScans.forEach((scan) => {
      const roomIdStr = scan.roomId.toString();
      if (occupancyMap.has(roomIdStr)) {
        occupancyMap.set(roomIdStr, {
          status: "Occupied",
          occupiedUntil: scan.expiresAt,
        });
      }
    });

    return occupancyMap;
  } catch (error) {
    console.error("Error computing multiple room occupancy:", error);
    const map = new Map();
    roomIds.forEach((id) => {
      map.set(id.toString(), { status: "Available", occupiedUntil: null });
    });
    return map;
  }
};

/**
 * Clean up expired scans (can be run as a cron job)
 */
const cleanupExpiredScans = async () => {
  try {
    const result = await RoomScanLog.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    console.log(`Cleaned up ${result.deletedCount} expired scan logs`);
    return result.deletedCount;
  } catch (error) {
    console.error("Error cleaning up expired scans:", error);
    return 0;
  }
};

module.exports = {
  computeRoomOccupancy,
  computeMultipleRoomOccupancy,
  cleanupExpiredScans,
};

