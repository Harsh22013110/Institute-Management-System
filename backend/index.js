require("dotenv").config();
const connectToMongo = require("./database/db");
const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();
const path = require("path");
connectToMongo();
const port = process.env.PORT || 4000;
const cors = require("cors");

// Trust proxy for cookies in production
app.set("trust proxy", 1);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
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

app.use("/media", express.static(path.join(__dirname, "media")));

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
app.use("/api/classroom", require("./routes/classroom.route"));
app.use("/api", require("./routes/room-scan.route"));

app.listen(port, () => {
  console.log(`Server Listening On http://localhost:${port}`);
});
