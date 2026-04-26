const RoomScanLog = require("../models/room-scan-log.model");
const Classroom = require("../models/classroom.model");
const ApiResponse = require("../utils/ApiResponse");
const { computeRoomOccupancy, computeMultipleRoomOccupancy } = require("../utils/occupancy");
const { verifyRoomQRToken, generateRoomQRToken } = require("../utils/qr-token");
const { getRoomFieldName } = require("../utils/roomField");

// Store for SSE clients
const sseClients = new Set();

/**
 * Broadcast room status change to all SSE clients
 */
const broadcastRoomStatusChange = (roomNumber, status, occupiedUntil) => {
  const message = JSON.stringify({
    event: "room.status.changed",
    data: {
      roomId: roomNumber, // Use roomNumber for consistency
      status,
      occupiedUntil: occupiedUntil ? occupiedUntil.toISOString() : null,
    },
  });

  sseClients.forEach((client) => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (error) {
      console.error("Error broadcasting to SSE client:", error);
      sseClients.delete(client);
    }
  });
};

/**
 * POST /api/rooms/:roomKey/scan?token=<jwt>
 * Scan a room QR code to mark it as occupied
 * req.room and req.roomNumber are set by room-param.middleware
 */
const scanRoomController = async (req, res) => {
  try {
    const { token } = req.query; // QR token from query string
    const userId = req.userId; // From auth middleware
    const now = new Date();
    const roomNumber = req.roomNumber; // Set by room-param.middleware
    const room = req.room; // Set by room-param.middleware

    // Validate QR token
    if (!token) {
      return ApiResponse.badRequest("QR token is required").send(res);
    }

    // Verify QR token matches roomNumber
    const decoded = verifyRoomQRToken(token, roomNumber);
    if (!decoded) {
      return ApiResponse.unauthorized("Invalid or mismatched QR token").send(res);
    }

    // Check for existing non-expired occupancy
    const existingScan = await RoomScanLog.findOne({
      roomId: roomNumber,
      expiresAt: { $gt: now },
    }).sort({ expiresAt: -1 });

    let expiresAt;
    if (existingScan) {
      // Extend by 1 hour from now, but keep the later expiry
      const newExpiry = new Date(now.getTime() + 3600 * 1000);
      expiresAt = new Date(Math.max(existingScan.expiresAt.getTime(), newExpiry.getTime()));
    } else {
      // New occupancy: 1 hour from now
      expiresAt = new Date(now.getTime() + 3600 * 1000);
    }

    // Create scan log
    const scanLog = await RoomScanLog.create({
      roomId: roomNumber,
      teacherId: userId,
      scannedAt: now,
      expiresAt,
      source: "qr",
    });

    console.log(`Room ${roomNumber} scanned by user ${userId}. Expires at: ${expiresAt.toISOString()}`);

    // Broadcast status change (use roomNumber)
    broadcastRoomStatusChange(roomNumber, "Occupied", expiresAt);
    console.log(`Broadcasted status change for room ${roomNumber}: Occupied until ${expiresAt.toISOString()}`);

    return ApiResponse.success(
      {
        success: true,
        status: "Occupied",
        expiresAt: expiresAt.toISOString(),
      },
      "Room marked as occupied"
    ).send(res);
  } catch (error) {
    console.error("Scan room error:", error);
    return ApiResponse.internalServerError(error.message).send(res);
  }
};

/**
 * GET /api/classrooms
 * Get all classrooms with computed occupancy status
 */
const getClassroomsWithOccupancyController = async (req, res) => {
  try {
    const classrooms = await Classroom.find().sort({ roomNumber: 1 });
    const now = new Date();

    // Extract roomNumbers
    const roomNumbers = classrooms.map((room) => parseInt(room.roomNumber, 10));

    // Compute occupancy for all rooms
    const occupancyMap = await computeMultipleRoomOccupancy(roomNumbers, now);

    const classroomsWithOccupancy = classrooms.map((room) => {
      const roomNum = parseInt(room.roomNumber, 10);
      const occupancy = occupancyMap.get(roomNum) || {
        status: "Available",
        occupiedUntil: null,
      };
      return {
        _id: room._id,
        roomNumber: room.roomNumber,
        capacity: room.capacity,
        floor: room.floor,
        status: room.status, // Manual status (available/occupied/maintenance)
        occupancyStatus: occupancy.status, // Computed occupancy
        occupiedUntil: occupancy.occupiedUntil
          ? occupancy.occupiedUntil.toISOString()
          : null,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      };
    });

    return ApiResponse.success(
      classroomsWithOccupancy,
      "Classrooms loaded with occupancy status"
    ).send(res);
  } catch (error) {
    console.error("Get classrooms error:", error);
    return ApiResponse.internalServerError(error.message).send(res);
  }
};

/**
 * DELETE /api/rooms/:roomKey/occupancy
 * Force clear room occupancy (admin only)
 * req.room and req.roomNumber are set by room-param.middleware
 */
const clearRoomOccupancyController = async (req, res) => {
  try {
    const now = new Date();
    const roomNumber = req.roomNumber; // Set by room-param.middleware

    // Set all active scans to expire now
    await RoomScanLog.updateMany(
      {
        roomId: roomNumber,
        expiresAt: { $gt: now },
      },
      {
        $set: { expiresAt: now },
      }
    );

    // Broadcast status change
    broadcastRoomStatusChange(roomNumber, "Available", null);

    return ApiResponse.success(
      { success: true },
      "Room occupancy cleared successfully"
    ).send(res);
  } catch (error) {
    console.error("Clear occupancy error:", error);
    return ApiResponse.internalServerError(error.message).send(res);
  }
};

/**
 * GET /api/rooms/qr/:roomKey
 * Generate QR code PNG for a room (admin only)
 * req.room and req.roomNumber are set by room-param.middleware
 */
const generateRoomQRController = async (req, res) => {
  try {
    const QRCode = require("qrcode");
    const roomNumber = req.roomNumber; // Set by room-param.middleware
    const room = req.room; // Set by room-param.middleware

    // Generate QR token with roomNumber
    const token = generateRoomQRToken(roomNumber);

    // Generate QR URL using FRONTEND_URL from env
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const qrUrl = `${frontendUrl}/scan/room?roomId=${roomNumber}&token=${token}`;

    // Generate QR code as PNG buffer (width ~800 as per requirements)
    const qrBuffer = await QRCode.toBuffer(qrUrl, {
      type: "png",
      width: 800,
      margin: 2,
    });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `inline; filename="room-${room.roomNumber}-qr.png"`);
    res.send(qrBuffer);
  } catch (error) {
    console.error("Generate QR error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || "Error generating QR code",
      });
    }
  }
};

/**
 * GET /api/rooms/qr/bulk?from=401&to=412
 * Generate QR codes for multiple rooms and return as ZIP (admin only)
 */
const generateBulkQRController = async (req, res) => {
  let archive = null;
  try {
    const { from, to } = req.query;
    const QRCode = require("qrcode");
    const archiver = require("archiver");

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "from and to parameters are required",
      });
    }

    const fromNum = parseInt(from, 10);
    const toNum = parseInt(to, 10);

    if (isNaN(fromNum) || isNaN(toNum) || fromNum > toNum) {
      return res.status(400).json({
        success: false,
        message: "Invalid from/to parameters",
      });
    }

    // Detect the actual room field name from schema
    const field = getRoomFieldName();
    console.log(`Bulk QR generation: Using field '${field}' for room lookup`);

    // Build array of room numbers (both as numbers and strings for flexibility)
    const roomNumbers = [];
    const roomNumberStrings = [];
    for (let i = fromNum; i <= toNum; i++) {
      roomNumbers.push(i);
      roomNumberStrings.push(i.toString());
    }

    // Find rooms in range - try both numeric and string matching
    const rooms = await Classroom.find({
      $or: [
        { [field]: { $in: roomNumbers } },
        { [field]: { $in: roomNumberStrings } },
      ],
    }).sort({ [field]: 1 });

    console.log(`Bulk QR generation: Looking for rooms ${roomNumberStrings.join(", ")}`);
    console.log(`Bulk QR generation: Found ${rooms.length} rooms in range ${fromNum}-${toNum}`);

    if (rooms.length === 0) {
      // Check if any rooms exist at all
      const totalRooms = await Classroom.countDocuments();
      console.log(`Total rooms in database: ${totalRooms}`);
      return res.status(404).json({
        success: false,
        message: `No rooms found in specified range (${fromNum}-${toNum}). Total rooms in database: ${totalRooms}. Please run the classroom seeder first.`,
      });
    }

    // Warn if not all rooms found
    if (rooms.length < roomNumberStrings.length) {
      const foundNumbers = rooms.map(r => r.roomNumber);
      const missingNumbers = roomNumberStrings.filter(rn => !foundNumbers.includes(rn));
      console.warn(`Warning: Missing rooms: ${missingNumbers.join(", ")}`);
    }

    // Set up ZIP response BEFORE any async operations
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="room-qrs.zip"`
    );

    archive = archiver("zip", { zlib: { level: 9 } });
    
    // Handle archive errors
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Error creating ZIP archive",
        });
      }
    });

    archive.pipe(res);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    // Generate QR for each room
    let successCount = 0;
    for (const room of rooms) {
      // Extract room number from the detected field
      const roomValue = room[field];
      const roomNumber = Number(roomValue);
      
      if (Number.isNaN(roomNumber)) {
        console.warn(`Skipping invalid room number: ${roomValue} (field: ${field})`);
        continue;
      }

      try {
        const token = generateRoomQRToken(roomNumber);
        const qrUrl = `${frontendUrl}/scan/room?roomId=${roomNumber}&token=${token}`;
        const qrBuffer = await QRCode.toBuffer(qrUrl, {
          type: "png",
          width: 800,
          margin: 2,
        });

        archive.append(qrBuffer, { name: `room-${roomNumber}.png` });
        successCount++;
        console.log(`Generated QR for room ${roomNumber}`);
      } catch (qrError) {
        console.error(`Error generating QR for room ${roomNumber}:`, qrError);
        // Continue with other rooms even if one fails
      }
    }

    console.log(`Bulk QR generation: Successfully generated ${successCount} QR codes`);

    // Finalize the archive
    await archive.finalize();
    console.log("Bulk QR ZIP archive finalized");
  } catch (error) {
    console.error("Generate bulk QR error:", error);
    if (archive && !archive.finalized) {
      archive.abort();
    }
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || "Error generating QR codes",
      });
    } else {
      // Headers already sent, try to end the response
      res.end();
    }
  }
};

/**
 * GET /api/rooms/:roomKey/logs?limit=50
 * Get scan logs for a room (admin only)
 * req.room and req.roomNumber are set by room-param.middleware
 */
const getRoomLogsController = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const roomNumber = req.roomNumber; // Set by room-param.middleware

    const logs = await RoomScanLog.find({ roomId: roomNumber })
      .sort({ scannedAt: -1 })
      .limit(limit)
      .populate("teacherId", "firstName lastName email employeeId")
      .lean();

    return ApiResponse.success(logs, "Room logs retrieved successfully").send(res);
  } catch (error) {
    console.error("Get room logs error:", error);
    return ApiResponse.internalServerError(error.message).send(res);
  }
};

/**
 * GET /api/events
 * SSE endpoint for real-time room status updates (requireAuth)
 * Note: Auth middleware checks cookies first, but EventSource can't send custom headers
 * So we also check token in query as fallback
 */
const sseEventsController = (req, res) => {
  // Auth is handled by middleware, but if it fails, we can check query token as fallback
  // (This is a safety check - auth middleware should have already verified)
  
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // Add client to set
  sseClients.add(res);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ event: "connected" })}\n\n`);

  // Handle client disconnect
  req.on("close", () => {
    sseClients.delete(res);
  });
};

module.exports = {
  scanRoomController,
  getClassroomsWithOccupancyController,
  clearRoomOccupancyController,
  generateRoomQRController,
  generateBulkQRController,
  getRoomLogsController,
  sseEventsController,
};
