const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const requireAdmin = require("../middlewares/admin.middleware");
const rateLimiter = require("../middlewares/rate-limiter.middleware");
const loadRoomByKey = require("../middlewares/room-param.middleware");
const {
  scanRoomController,
  getClassroomsWithOccupancyController,
  clearRoomOccupancyController,
  generateRoomQRController,
  generateBulkQRController,
  getRoomLogsController,
  sseEventsController,
} = require("../controllers/room-scan.controller");
const { debugRoomLookupController } = require("../controllers/debug.controller");

// Register param middleware for roomKey (roomNumber)
router.param("roomKey", loadRoomByKey);

// SSE endpoint (requireAuth)
router.get("/events", auth, sseEventsController);

// Room scanning endpoint (requires auth - teacher or admin)
// Uses :roomKey which is resolved to roomNumber by middleware
router.post(
  "/rooms/:roomKey/scan",
  auth,
  rateLimiter(2, 60000), // 2 requests per minute
  scanRoomController
);

// Get classrooms with occupancy
router.get("/classrooms", getClassroomsWithOccupancyController);

// Force clear occupancy (admin only)
router.delete("/rooms/:roomKey/occupancy", auth, requireAdmin, clearRoomOccupancyController);

// QR generation endpoints (admin only)
// IMPORTANT: bulk route must be declared BEFORE the param route to avoid matching "bulk" as a roomKey
router.get("/rooms/qr/bulk", auth, requireAdmin, generateBulkQRController);
router.get(
  "/rooms/qr/:roomKey([0-9a-fA-F]{24}|\\d+)",
  auth,
  requireAdmin,
  generateRoomQRController
);

// Room logs (admin only)
router.get("/rooms/:roomKey/logs", auth, requireAdmin, getRoomLogsController);

// Debug endpoint (admin only) - can be removed after testing
router.get("/debug/room-lookup/:key", auth, requireAdmin, debugRoomLookupController);

module.exports = router;

