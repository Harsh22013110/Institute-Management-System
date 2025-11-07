# Production Setup Guide

## Environment Configuration

### Backend Environment Variables (`backend/.env`)

```env
PORT=4000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://127.0.0.1:27017/College-Management-System
JWT_SECRET=THISISSECRET

# Optional: For production
NODE_ENV=production

# Optional: Email configuration
NODEMAILER_EMAIL=
NODEMAILER_PASS=
```

**Important:** 
- `FRONTEND_URL` must match your frontend URL exactly
- `JWT_SECRET` should be a strong, random string in production
- In production with HTTPS, cookies will be secure automatically

### Frontend Environment Variables (`frontend/.env`)

```env
REACT_APP_APILINK=http://localhost:4000/api
REACT_APP_MEDIALINK=http://localhost:4000/media
```

**Important:**
- `REACT_APP_APILINK` must point to your backend API
- `REACT_APP_MEDIALINK` must point to your backend media directory

## Authentication System

### Cookie-Based Authentication

The system uses **cookie-based authentication** with Bearer token fallback:

1. **Login Flow:**
   - User logs in via `/api/{admin|faculty|student}/login`
   - Server sets an `httpOnly` cookie named `token` (7-day expiry)
   - Server also returns token in response body (for localStorage fallback)
   - Frontend stores token in localStorage as backup

2. **Request Authentication:**
   - Server checks `req.cookies.token` first (preferred)
   - Falls back to `Authorization: Bearer <token>` header
   - All authenticated endpoints work with either method

3. **Session Persistence:**
   - Cookies persist across page refreshes
   - No need to re-login on refresh
   - Token expires after 7 days

### CORS Configuration

- Backend allows credentials from `FRONTEND_URL`
- Frontend axios instance has `withCredentials: true`
- Cookies are sent automatically with all requests

## QR Code Occupancy System

### Setup

1. **Seed Classrooms:**
   ```bash
   cd backend
   node classroom-seeder.js
   ```

2. **Download QR Codes:**
   - Login as admin
   - Go to Admin → Classroom
   - Click "Download All QR Codes"
   - ZIP file downloads with QR codes for rooms 401-412

### How It Works

1. **QR Code Generation:**
   - Each room gets a unique signed JWT token
   - QR code contains: `${FRONTEND_URL}/scan/room?roomId=<id>&token=<jwt>`
   - Tokens are valid for 365 days

2. **Scanning Process:**
   - Teacher scans QR code
   - Redirected to `/scan/room` page
   - If not logged in → login → redirect back
   - Click "Confirm Occupy for 1 Hour"
   - Room marked as occupied for 1 hour

3. **Occupancy Management:**
   - Occupancy computed from `room_scan_logs` table
   - Room is "Occupied" if `expiresAt > now`
   - Re-scanning extends by 1 hour (idempotent)
   - Admin can force clear occupancy

4. **Real-Time Updates:**
   - SSE endpoint: `/api/events`
   - Broadcasts `room.status.changed` events
   - Frontend Classroom page subscribes and updates live

## API Endpoints

### Health Check
```
GET /api/health
Response: { ok: true, env: { port, frontendUrl } }
```

### Authentication
```
POST /api/{admin|faculty|student}/login
Body: { email, password }
Response: { success: true, data: { token }, message: "Login successful" }
Cookie: token (httpOnly, 7 days)
```

### Classrooms
```
GET /api/classrooms
Headers: Cookie or Authorization: Bearer <token>
Response: { success: true, data: [{ _id, roomNumber, capacity, floor, status, occupancyStatus, occupiedUntil, ... }] }
```

### QR Codes (Admin Only)
```
GET /api/rooms/qr/:roomId
Headers: Cookie or Authorization: Bearer <token>
Response: PNG image (image/png)

GET /api/rooms/qr/bulk?from=401&to=412
Headers: Cookie or Authorization: Bearer <token>
Response: ZIP file (application/zip)
```

### Room Scanning
```
POST /api/rooms/:roomId/scan?token=<qr_jwt_token>
Headers: Cookie or Authorization: Bearer <token>
Body: {}
Response: { success: true, data: { status: "Occupied", expiresAt: "<ISO>" } }
```

### Clear Occupancy (Admin Only)
```
DELETE /api/rooms/:roomId/occupancy
Headers: Cookie or Authorization: Bearer <token>
Response: { success: true, message: "Room occupancy cleared successfully" }
```

## Testing Checklist

### ✅ Health Check
- [ ] `GET /api/health` returns `{ ok: true }`

### ✅ Login
- [ ] Login works with correct credentials
- [ ] Cookie is set in browser
- [ ] Token returned in response
- [ ] Subsequent requests work without re-login

### ✅ QR Code Download
- [ ] "Download All QR Codes" button works when logged in as admin
- [ ] ZIP file downloads with correct filename
- [ ] ZIP contains PNG files: `room-401.png` through `room-412.png`
- [ ] Direct URL access (not logged in) returns 401 JSON

### ✅ QR Code Scanning
- [ ] QR code contains correct URL format
- [ ] Scanning redirects to login if not authenticated
- [ ] After login, redirects back to scan page
- [ ] "Confirm Occupy" marks room as occupied
- [ ] Status updates in real-time on admin dashboard

### ✅ Occupancy Management
- [ ] Room shows "Occupied" with countdown after scan
- [ ] Re-scanning extends expiry by 1 hour
- [ ] After 1 hour, status changes to "Available"
- [ ] Admin can force clear occupancy
- [ ] Force clear broadcasts real-time update

### ✅ Network & CORS
- [ ] No CORS errors in browser console
- [ ] All API calls succeed
- [ ] Cookies are sent with requests
- [ ] No hardcoded URLs in code

## Troubleshooting

### Login Not Working
1. Check backend `.env` has correct `FRONTEND_URL`
2. Check frontend `.env` has correct `REACT_APP_APILINK`
3. Verify backend server is running on port 4000
4. Check browser console for CORS errors
5. Verify cookies are being set (check DevTools → Application → Cookies)

### QR Download Not Working
1. Ensure you're logged in as admin
2. Check browser console for errors
3. Verify endpoint returns 401 if not authenticated
4. Check Network tab for request/response

### Real-Time Updates Not Working
1. Check SSE connection in Network tab
2. Verify `/api/events` endpoint is accessible
3. Check browser console for SSE errors
4. Verify CORS allows credentials

### Network Errors
1. Verify backend server is running: `npm run dev` in backend/
2. Check backend logs for errors
3. Verify MongoDB is running
4. Check `.env` files are correct
5. Restart both frontend and backend servers

## Production Deployment Notes

1. **Environment Variables:**
   - Set `NODE_ENV=production` in backend
   - Use HTTPS URLs for `FRONTEND_URL`
   - Use strong `JWT_SECRET`

2. **Security:**
   - Cookies will automatically be `secure: true` in production (HTTPS)
   - Ensure CORS origin matches your production frontend URL
   - Use environment-specific secrets

3. **Performance:**
   - Consider Redis for occupancy caching (optional)
   - Set up cleanup job for expired scan logs
   - Monitor SSE connections

4. **Monitoring:**
   - Health check endpoint for uptime monitoring
   - Log scan events for audit trail
   - Monitor room occupancy patterns

