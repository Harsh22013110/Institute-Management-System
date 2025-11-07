const RoomScanLog = require("../models/room-scan-log.model");
const Classroom = require("../models/classroom.model");
const ApiResponse = require("../utils/ApiResponse");
const { computeRoomOccupancy } = require("../utils/occupancy");
const { verifyRoomQRToken } = require("../utils/qr-token");
const rateLimiter = require("../middlewares/rate-limiter.middleware");

// Store for SSE clients
const sseClients = new Set();

/**
 * Broadcast room status change to all SSE clients
 */
const broadcastRoomStatusChange = (roomId, status, occupiedUntil) => {
  const message = JSON.stringify({
    event: "room.status.changed",
    data: {
      roomId,
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
 * POST /api/rooms/:roomId/scan
 * Scan a room QR code to mark it as occupied
 */
const scanRoomController = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { token } = req.query; // QR token from query string
    const userId = req.userId; // From auth middleware
    const now = new Date();

    // Validate QR token
    if (!token) {
      return ApiResponse.badRequest("QR token is required").send(res);
    }

    const decoded = verifyRoomQRToken(token, roomId);
    if (!decoded) {
      return ApiResponse.unauthorized("Invalid or mismatched QR token").send(res);
    }

    // Verify room exists
    const room = await Classroom.findById(roomId);
    if (!room) {
      return ApiResponse.notFound("Room not found").send(res);
    }

    // Check for existing non-expired occupancy
    const existingScan = await RoomScanLog.findOne({
      roomId,
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

    // Create or update scan log
    const scanLog = await RoomScanLog.create({
      roomId,
      roomNumber: room.roomNumber,
      teacherId: userId,
      scannedAt: now,
      expiresAt,
      source: "qr",
    });

    // Broadcast status change
    broadcastRoomStatusChange(roomId, "Occupied", expiresAt);

    return ApiResponse.success(
      {
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

    // Compute occupancy for all rooms
    const classroomsWithOccupancy = await Promise.all(
      classrooms.map(async (room) => {
        const occupancy = await computeRoomOccupancy(room._id, now);
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
      })
    );

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
 * DELETE /api/rooms/:roomId/occupancy
 * Force clear room occupancy (admin only)
 */
const clearRoomOccupancyController = async (req, res) => {
  try {
    const { roomId } = req.params;
    const now = new Date();

    // Verify room exists
    const room = await Classroom.findById(roomId);
    if (!room) {
      return ApiResponse.notFound("Room not found").send(res);
    }

    // Set all active scans to expire now
    await RoomScanLog.updateMany(
      {
        roomId,
        expiresAt: { $gt: now },
      },
      {
        $set: { expiresAt: now },
      }
    );

    // Broadcast status change
    broadcastRoomStatusChange(roomId, "Available", null);

    return ApiResponse.success(
      null,
      "Room occupancy cleared successfully"
    ).send(res);
  } catch (error) {
    console.error("Clear occupancy error:", error);
    return ApiResponse.internalServerError(error.message).send(res);
  }
};

/**
 * GET /api/rooms/qr/:roomId
 * Generate QR code PNG for a room (admin only)
 */
const generateRoomQRController = async (req, res) => {
  try {
    const { roomId } = req.params;
    const QRCode = require("qrcode");

    // Verify room exists
    const room = await Classroom.findById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: "Room not found",
      });
      return;
    }

    // Generate QR token
    const { generateRoomQRToken } = require("../utils/qr-token");
    const token = generateRoomQRToken(roomId.toString());

    // Generate QR URL using FRONTEND_URL from env
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const qrUrl = `${frontendUrl}/scan/room?roomId=${roomId}&token=${token}`;

    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(qrUrl, {
      type: "png",
      width: 300,
      margin: 2,
    });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `inline; filename="room-${room.roomNumber}-qr.png"`);
    res.send(qrBuffer);
  } catch (error) {
    console.error("Generate QR error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error generating QR code",
    });
  }
};

/**
 * GET /api/rooms/qr/bulk?from=401&to=412
 * Generate QR codes for multiple rooms and return as ZIP (admin only)
 */
const generateBulkQRController = async (req, res) => {
  try {
    const { from, to } = req.query;
    const QRCode = require("qrcode");
    const archiver = require("archiver");

    if (!from || !to) {
      res.status(400).json({
        success: false,
        message: "from and to parameters are required",
      });
      return;
    }

    const fromNum = parseInt(from);
    const toNum = parseInt(to);

    if (isNaN(fromNum) || isNaN(toNum) || fromNum > toNum) {
      res.status(400).json({
        success: false,
        message: "Invalid from/to parameters",
      });
      return;
    }

    // Find rooms in range
    const rooms = await Classroom.find({
      roomNumber: { $gte: fromNum.toString(), $lte: toNum.toString() },
    }).sort({ roomNumber: 1 });

    if (rooms.length === 0) {
      res.status(404).json({
        success: false,
        message: "No rooms found in specified range",
      });
      return;
    }

    // Set up ZIP response
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="room-qrs-${from}-${to}.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    const { generateRoomQRToken } = require("../utils/qr-token");
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    // Generate QR for each room
    for (const room of rooms) {
      const token = generateRoomQRToken(room._id.toString());
      const qrUrl = `${frontendUrl}/scan/room?roomId=${room._id}&token=${token}`;
      const qrBuffer = await QRCode.toBuffer(qrUrl, {
        type: "png",
        width: 300,
        margin: 2,
      });

      archive.append(qrBuffer, { name: `room-${room.roomNumber}.png` });
    }

    await archive.finalize();
  } catch (error) {
    console.error("Generate bulk QR error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || "Error generating QR codes",
      });
    }
  }
};

/**
 * GET /api/rooms/:roomId/logs?limit=50
 * Get scan logs for a room (admin only)
 */
const getRoomLogsController = async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // Verify room exists
    const room = await Classroom.findById(roomId);
    if (!room) {
      return ApiResponse.notFound("Room not found").send(res);
    }

    const logs = await RoomScanLog.find({ roomId })
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
 * SSE endpoint for real-time room status updates
 * Optional: token can be passed as query param for auth
 */
const sseEventsController = (req, res) => {
  // Optional: verify token if provided
  const token = req.query.token;
  if (token) {
    try {
      const jwt = require("jsonwebtoken");
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Access-Control-Allow-Origin", "*");

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

