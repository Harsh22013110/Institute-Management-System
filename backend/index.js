require("dotenv").config();
const connectToMongo = require("./Database/db");
const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();
const path = require("path");
connectToMongo().catch((err) => {
  console.error("Failed to connect to MongoDB. Exiting.", err);
  process.exit(1);
});
const port = process.env.PORT || 4000;
const cors = require("cors");

// Trust proxy for cookies in production
app.set("trust proxy", 1);

// CORS configuration - Allow both localhost and LAN IP
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://10.148.86.146:3000",
  "http://127.0.0.1:3000"
].filter(Boolean); // Remove undefined values

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        // For development, allow any localhost or LAN IP
        if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.') || origin.includes('10.148.') || origin.includes('10.214.')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Hello 👋 I am Working Fine 🚀");
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    env: {
      port: process.env.PORT || 4000,
      frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    },
  });
});

// Serve static files
const staticOptions = {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
    }
  }
};

app.use("/media", express.static(path.join(__dirname, "media"), staticOptions));

app.use("/api/auth", require("./routes/auth.route"));
app.use("/api/admin", require("./routes/details/admin-details.route"));
app.use("/api/faculty", require("./routes/details/faculty-details.route"));
app.use("/api/student", require("./routes/details/student-details.route"));

app.use("/api/branch", require("./routes/branch.route"));
app.use("/api/subject", require("./routes/subject.route"));
app.use("/api/notice", require("./routes/notice.route"));
app.use("/api/timetable", require("./routes/timetable.route"));
app.use("/api/material", require("./routes/material.route"));
app.use("/api/exam", require("./routes/exam.route"));
app.use("/api/marks", require("./routes/marks.route"));
app.use("/api/attendance", require("./routes/attendance.route"));
app.use("/api/classroom", require("./routes/classroom.route"));
app.use("/api", require("./routes/room-scan.route"));

app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Backend running on http://0.0.0.0:${port}`);
  console.log(`   Accessible at: http://10.148.86.146:${port}`);
  console.log(`   Also accessible at: http://localhost:${port}`);
});
