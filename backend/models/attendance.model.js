const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    enrollmentNo: {
      type: String,
      required: true,
      index: true,
    },
    rollNo: {
      type: String,
    },
    studentName: {
      type: String,
    },
    branch: {
      type: String,
      index: true,
    },
    year: {
      type: Number,
      index: true,
    },
    totalClasses: {
      type: Number,
    },
    attendedClasses: {
      type: Number,
    },
    attendancePercentage: {
      type: Number,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminDetail",
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Prevent duplicates for the same student+branch+year
attendanceSchema.index({ enrollmentNo: 1, branch: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);

