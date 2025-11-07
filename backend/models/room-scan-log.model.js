const mongoose = require("mongoose");

const RoomScanLog = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
      index: true,
    },
    roomNumber: {
      type: String,
      required: true,
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    scannedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["qr", "manual"],
      default: "qr",
    },
  },
  { timestamps: true }
);

// Index for efficient queries
RoomScanLog.index({ roomId: 1, expiresAt: 1 });
RoomScanLog.index({ expiresAt: 1 });

module.exports = mongoose.model("RoomScanLog", RoomScanLog);

