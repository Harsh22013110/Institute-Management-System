# QR Code-Based Classroom Occupancy System

## Overview

This system allows teachers to scan QR codes posted in classrooms to mark rooms as occupied for 1 hour. The occupancy status is displayed in real-time on the Admin → Classroom page with live countdown timers.

## Features

- **QR Code Scanning**: Each room (401-412) has a unique signed QR code
- **1-Hour Occupancy**: Scanning marks a room as occupied for exactly 1 hour
- **Auto-Extension**: Re-scanning within the hour extends occupancy by another hour
- **Real-Time Updates**: Live status updates via Server-Sent Events (SSE)
- **Live Countdown**: Shows remaining time until occupancy expires
- **Force Clear**: Admins can manually clear room occupancy

## Setup Instructions

### Backend Setup

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Environment Variables** (`.env`):
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/College-Management-System
   PORT=4000
   FRONTEND_URL=http://localhost:3000
   JWT_SECRET=your_strong_secret_here
   FRONTEND_API_LINK=http://localhost:3000
   ```

3. **Run the Server**:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Install Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Environment Variables** (`.env`):
   ```env
   REACT_APP_APILINK=http://localhost:4000/api
   REACT_APP_MEDIA_LINK=http://localhost:4000/media
   ```

3. **Run the Frontend**:
   ```bash
   npm start
   ```

## API Endpoints

### Room Scanning
- `POST /api/rooms/:roomId/scan?token=<jwt>` - Scan a room QR code (requires auth)
- `GET /api/classrooms` - Get all classrooms with occupancy status
- `DELETE /api/rooms/:roomId/occupancy` - Force clear occupancy (admin only)

### QR Generation
- `GET /api/rooms/qr/:roomId` - Generate QR code PNG for a room
- `GET /api/rooms/qr/bulk?from=401&to=412` - Download ZIP of all QR codes

### Real-Time Events
- `GET /api/events` - SSE endpoint for real-time room status updates

### Logs
- `GET /api/rooms/:roomId/logs?limit=50` - Get scan logs for a room (admin only)

## Usage

### Generating QR Codes

1. **Via Browser** (Admin Dashboard):
   - Navigate to Admin → Classroom
   - Click "Download All QR Codes" button
   - This downloads a ZIP file with QR codes for rooms 401-412

2. **Via Script**:
   ```bash
   cd backend
   # Set ADMIN_TOKEN in .env or export it
   export ADMIN_TOKEN=your_admin_jwt_token
   node scripts/generate-room-qrs.js
   ```
   QR codes will be saved to `backend/exports/room-qrs/`

### Scanning a Room

1. Teacher scans the QR code with their phone
2. If not logged in, they're redirected to login
3. After login, they see the room details
4. Click "Confirm Occupy for 1 Hour"
5. Room is marked as occupied for 1 hour
6. Status updates in real-time on the admin dashboard

### Viewing Occupancy Status

1. Navigate to Admin → Classroom
2. View the "Occupancy Status" column:
   - **Available** (green) - Room is free
   - **Occupied** (red) - Room is occupied with countdown timer (MM:SS)
3. Status updates automatically via SSE

### Force Clearing Occupancy

1. In Admin → Classroom page
2. Click the "⋮" (more options) button on a room row
3. Select "Force Clear Occupancy"
4. Confirm the action
5. Room status immediately changes to Available

## Data Model

### RoomScanLog
- `roomId` - Reference to Classroom
- `roomNumber` - Room number (string)
- `teacherId` - Reference to teacher/admin who scanned
- `scannedAt` - Timestamp when scanned
- `expiresAt` - Timestamp when occupancy expires
- `source` - "qr" or "manual"

### Occupancy Computation

Occupancy is computed dynamically:
- Room is **Occupied** if there exists a `RoomScanLog` where `expiresAt > now`
- Room is **Available** if no active scan logs exist
- No permanent `occupied` boolean is stored

## Security

- QR codes contain signed JWT tokens
- Tokens are validated server-side
- Room ID from token must match request roomId
- Rate limiting: 2 scans per minute per user
- All timestamps stored in UTC

## Real-Time Updates

The system uses Server-Sent Events (SSE) for real-time updates:
- Frontend connects to `/api/events` on mount
- Server broadcasts `room.status.changed` events
- Frontend updates affected room rows instantly
- Auto-reconnects on connection loss

## Troubleshooting

### QR Code Not Working
- Verify JWT_SECRET is set correctly
- Check that roomId in token matches the room
- Ensure user is logged in

### Status Not Updating
- Check browser console for SSE connection errors
- Verify `/api/events` endpoint is accessible
- Check network tab for SSE messages

### Countdown Not Showing
- Verify `dayjs` is installed in frontend
- Check browser console for errors
- Ensure `occupiedUntil` is in ISO format

## Testing

### Manual Test Flow

1. Generate QR codes for rooms 401-412
2. Print and post QR codes
3. Scan QR code with phone (logged in as teacher)
4. Confirm occupancy
5. Check Admin → Classroom page shows "Occupied" with countdown
6. Wait 1 hour (or manually advance time in DB) - status should change to "Available"
7. Re-scan before expiry - should extend by 1 hour

### API Testing

```bash
# Get classrooms with occupancy
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/classrooms

# Scan a room
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/rooms/ROOM_ID/scan?token=QR_TOKEN"

# Force clear occupancy
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/rooms/ROOM_ID/occupancy
```

## Notes

- Occupancy is computed on-demand, not stored as a boolean
- Expired scan logs can be cleaned up periodically (see `cleanupExpiredScans()`)
- SSE connection auto-reconnects on failure
- All dates displayed in DD/MM/YYYY format
- Countdown updates every second

