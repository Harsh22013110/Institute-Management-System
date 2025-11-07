const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const rateLimiter = require("../middlewares/rate-limiter.middleware");
const {
  scanRoomController,
  getClassroomsWithOccupancyController,
  clearRoomOccupancyController,
  generateRoomQRController,
  generateBulkQRController,
  getRoomLogsController,
  sseEventsController,
} = require("../controllers/room-scan.controller");

// SSE endpoint (no auth required, but can be added if needed)
router.get("/events", sseEventsController);

// Room scanning endpoint (requires auth - teacher or admin)
router.post(
  "/rooms/:roomId/scan",
  auth,
  rateLimiter(2, 60000), // 2 requests per minute
  scanRoomController
);

// Get classrooms with occupancy
router.get("/classrooms", auth, getClassroomsWithOccupancyController);

// Force clear occupancy (admin only - add admin check middleware if needed)
router.delete("/rooms/:roomId/occupancy", auth, clearRoomOccupancyController);

// QR generation endpoints
router.get("/rooms/qr/:roomId", auth, generateRoomQRController);
router.get("/rooms/qr/bulk", auth, generateBulkQRController);

// Room logs (admin only)
router.get("/rooms/:roomId/logs", auth, getRoomLogsController);

module.exports = router;

