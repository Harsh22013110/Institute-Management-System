require("dotenv").config();
const express = require("express");
const router = express.Router();
const upload = require("../middlewares/multer.middleware");
const auth = require("../middlewares/auth.middleware");

const {
  uploadAttendanceController,
  getAttendanceController,
  getDefaultersController,
  getMyAttendanceController,
  exportDefaultersController,
} = require("../controllers/attendance.controller");

// Upload attendance via Excel
router.post(
  "/upload",
  auth,
  upload.single("file"),
  uploadAttendanceController
);

// List attendance records (supports filters)
router.get("/", auth, getAttendanceController);

// List defaulters
router.get("/defaulters", auth, getDefaultersController);

// Download defaulters as CSV
router.get("/defaulters/export", auth, exportDefaultersController);

// Logged-in student attendance
router.get("/me", auth, getMyAttendanceController);

module.exports = router;

