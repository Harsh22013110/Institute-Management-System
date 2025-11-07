const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const API_URL = process.env.API_URL || "http://localhost:4000";
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// You'll need to login first to get a token, or use a service account token
// For this script, we'll assume you have an admin token
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

async function generateRoomQRs() {
  try {
    // Create exports directory if it doesn't exist
    const exportsDir = path.join(__dirname, "../exports/room-qrs");
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    console.log("Generating QR codes for rooms 401-412...");

    // First, get all classrooms to get their IDs
    const classroomsResponse = await axios.get(`${API_URL}/api/classroom`, {
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
    });

    if (!classroomsResponse.data.success) {
      throw new Error("Failed to fetch classrooms");
    }

    const classrooms = classroomsResponse.data.data.filter(
      (room) => parseInt(room.roomNumber) >= 401 && parseInt(room.roomNumber) <= 412
    );

    console.log(`Found ${classrooms.length} rooms in range 401-412`);

    // Generate QR for each room
    for (const room of classrooms) {
      try {
        const qrResponse = await axios.get(
          `${API_URL}/api/rooms/qr/${room._id}`,
          {
            headers: {
              Authorization: `Bearer ${ADMIN_TOKEN}`,
            },
            responseType: "arraybuffer",
          }
        );

        const filename = `room-${room.roomNumber}-qr.png`;
        const filepath = path.join(exportsDir, filename);
        fs.writeFileSync(filepath, qrResponse.data);
        console.log(`✓ Generated QR for Room ${room.roomNumber}`);
      } catch (error) {
        console.error(`✗ Failed to generate QR for Room ${room.roomNumber}:`, error.message);
      }
    }

    console.log(`\nAll QR codes saved to: ${exportsDir}`);
    console.log("\nTo generate a ZIP file, use the bulk endpoint:");
    console.log(`GET ${API_URL}/api/rooms/qr/bulk?from=401&to=412`);
  } catch (error) {
    console.error("Error generating QR codes:", error.message);
    if (error.response) {
      console.error("Response:", error.response.data);
    }
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  if (!ADMIN_TOKEN) {
    console.error("ERROR: ADMIN_TOKEN environment variable is required");
    console.error("Please set it in your .env file or export it:");
    console.error("export ADMIN_TOKEN=your_admin_jwt_token");
    process.exit(1);
  }
  generateRoomQRs();
}

module.exports = { generateRoomQRs };

