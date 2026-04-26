const RoomScanLog = require("../models/room-scan-log.model");

/**
 * Compute occupancy status for a room
 * @param {Number} roomNumber - Room number (e.g., 401, 402)
 * @param {Date} now - Current time (defaults to now)
 * @returns {Promise<{status: string, occupiedUntil: Date|null}>}
 */
const computeRoomOccupancy = async (roomNumber, now = new Date()) => {
  try {
    // Convert roomNumber to Number if it's a string
    const roomNum = typeof roomNumber === "number" ? roomNumber : parseInt(roomNumber, 10);
    
    // Find the most recent non-expired scan
    const activeScan = await RoomScanLog.findOne({
      roomId: roomNum,
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
 * @param {Array<Number>} roomNumbers - Array of room numbers (e.g., [401, 402])
 * @param {Date} now - Current time
 * @returns {Promise<Map<Number, {status: string, occupiedUntil: Date|null}>>}
 */
const computeMultipleRoomOccupancy = async (roomNumbers, now = new Date()) => {
  try {
    // Convert all to numbers
    const roomNums = roomNumbers.map((rn) => typeof rn === "number" ? rn : parseInt(rn, 10));
    
    const activeScans = await RoomScanLog.find({
      roomId: { $in: roomNums },
      expiresAt: { $gt: now },
    })
      .sort({ roomId: 1, expiresAt: -1 }) // Sort by roomId first, then by expiresAt descending
      .lean();

    const occupancyMap = new Map();

    // Initialize all rooms as Available
    roomNums.forEach((rn) => {
      occupancyMap.set(rn, {
        status: "Available",
        occupiedUntil: null,
      });
    });

    // Group scans by roomId and take the most recent (first after sorting)
    const scansByRoom = new Map();
    activeScans.forEach((scan) => {
      const roomNum = scan.roomId;
      if (!scansByRoom.has(roomNum)) {
        scansByRoom.set(roomNum, scan);
      }
    });

    // Update occupancy map with the most recent scan for each room
    scansByRoom.forEach((scan, roomNum) => {
      if (occupancyMap.has(roomNum)) {
        occupancyMap.set(roomNum, {
          status: "Occupied",
          occupiedUntil: scan.expiresAt,
        });
      }
    });

    return occupancyMap;
  } catch (error) {
    console.error("Error computing multiple room occupancy:", error);
    const map = new Map();
    roomNumbers.forEach((rn) => {
      const roomNum = typeof rn === "number" ? rn : parseInt(rn, 10);
      map.set(roomNum, { status: "Available", occupiedUntil: null });
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

