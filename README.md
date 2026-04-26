# College Management System

[![MERN Stack](https://img.shields.io/badge/Stack-MERN-blue)](https://www.mongodb.com/mern-stack)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v14+-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-v17+-blue)](https://reactjs.org)

A comprehensive MERN stack-based College Management System that helps manage academic activities, student information, faculty details, and administrative tasks. This system streamlines the management of educational institutions by providing a centralized platform for administrators, faculty, and students.

## Features

### Admin Features

- Manage faculty accounts with detailed profiles and emergency contacts
- Manage student accounts with enrollment numbers and academic details
- Manage academic branches
- Handle subject/course management by semester and branch
- Generate and manage notices for students and faculty
- Upload and manage timetables by branch and semester
- Profile management and password updates

### Faculty Features

- View and manage personal profile with emergency contacts
- Upload and manage study materials (notes, assignments, syllabus)
- Filter and organize materials by subject, semester, and type
- Upload and manage timetables for their branches
- Search and view student information by enrollment, name, or semester
- View and respond to notices
- Update profile and credentials
- Password management and reset functionality

### Student Features

- View personal profile and academic details
- Access study materials filtered by subject and type
- View class timetables with download option
- Access notices and announcements
- Update profile information
- Password management and reset functionality

## Tech Stack

- Frontend: React.js
- Backend: Node.js, Express.js
- Database: MongoDB
- Authentication: JWT

## Prerequisites

- Node.js
- MongoDB
- npm

## Setup Instructions

Project Setup Video Tutorial: https://youtu.be/gw4jh4RHzuo

Sample .env file is added in both backend and frontend, copy that variables and create `.env` in both the folders and then follow below given instructions

1. Clone the repository:

```bash
git clone <repository-url>
cd College-Management-System
```

2. Install dependencies:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Create a `.env` file in the backend directory with the following variables:

```env
PORT=4000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://127.0.0.1:27017/College-Management-System
JWT_SECRET=THISISSECRET

NODEMAILER_EMAIL=
NODEMAILER_PASS=
```

**Note:** In production, set `NODE_ENV=production` and use HTTPS URLs.

4. Create a `.env` file in the frontend directory:

```env
REACT_APP_APILINK=http://localhost:4000/api
REACT_APP_MEDIALINK=http://localhost:4000/media
```

5. Start the development servers:

```bash
# Start backend server (from backend directory)
npm run dev

# Start frontend server (from frontend directory)
npm start
```

## Initial Setup

1. Create an admin account using the seeder:

```bash
cd backend
npm run seed
```

This will create a default admin account with the following credentials:

- Employee ID: 123456
- Password: admin123
- Email: admin@gmail.com

**Note:** Seeders are safe by default and won't delete existing data. Use `--reset` flag to clear and reseed:
```bash
node admin-seeder.js --reset
node classroom-seeder.js --reset
```

2. Create classrooms (401-412):

```bash
cd backend
node classroom-seeder.js
```

## QR Occupancy – Setup & Use

### Environment Variables

**Backend (`backend/.env`):**
```env
PORT=4000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://127.0.0.1:27017/College-Management-System
JWT_SECRET=THISISSECRET
```

**Frontend (`frontend/.env`):**
```env
REACT_APP_APILINK=http://localhost:4000/api
REACT_APP_MEDIALINK=http://localhost:4000/media
```

### Ports & Start Commands

- **Frontend**: http://localhost:3000 (CRA)
- **Backend**: http://localhost:4000 (Express + Mongo)

**Start Commands:**
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm start
```

### Seeding Classrooms

Create classrooms 401-412:
```bash
cd backend
node classroom-seeder.js
```

To reset and reseed (destructive):
```bash
node classroom-seeder.js --reset
```

### How It Works

#### 1-Hour Session System

- **Initial Scan**: Teacher scans QR → confirms → room becomes **Occupied** for **EXACTLY 1 hour**
- **Auto-Return**: After 1 hour, room automatically returns to **Available** (no manual action needed)
- **Re-Scan Extension**: If teacher scans again within the hour, occupancy extends by another hour from the current time (or keeps the later expiry if already extended)

#### Occupancy Logic

- **No boolean stored**: Occupancy is computed from `room_scan_logs` collection
- A room is **Occupied** if a log exists where `expiresAt > now` (UTC)
- Re-scanning extends `expiresAt` to `max(existing, now+3600s)`

### Downloading QR Codes

**Via Admin Dashboard:**
1. Login as admin
2. Navigate to **Admin → Classroom**
3. Click **"Download All QR Codes"** button
4. Downloads `room-qrs.zip` with QR codes for rooms 401-412
5. **Note**: Requires admin login (uses cookie authentication)

**Single QR Code:**
- `GET /api/rooms/qr/401` (admin only) - Returns PNG image

### Printing QR Codes

1. Download the ZIP file from admin dashboard
2. Extract the PNG files (`room-401.png`, `room-402.png`, etc.)
3. Print each QR code and post it in the corresponding classroom
4. Each QR code is unique and signed with a JWT token

### Using QR Codes (Teacher Flow)

1. Teacher scans QR code with phone camera
2. Browser opens: `http://localhost:3000/scan/room?roomId=401&token=<jwt>`
3. If not logged in → redirects to login → then returns to scan page
4. Teacher sees room details (number, capacity, floor)
5. Clicks **"Confirm Occupy for 1 Hour"**
6. Room immediately becomes **Occupied** for 1 hour
7. Success message shows expiry time and live countdown
8. Re-scanning extends by another hour

### Admin Dashboard Features

**Real-Time Status:**
- Navigate to **Admin → Classroom**
- View **Occupancy Status** column:
  - **Available** (green chip) - Room is free
  - **Occupied** (red chip) - Room is occupied with live countdown (MM:SS format)
- Status updates **instantly** via Server-Sent Events (SSE)
- Countdown updates every 1 second

**Force Clear:**
- Click **"Force Clear Occupancy"** (admin only)
- Immediately sets room to **Available**
- Broadcasts update to all connected clients via SSE

### API Endpoints

- `GET /api/health` → `{ ok: true }`
- `GET /api/classrooms` - Get all classrooms with computed occupancy status
- `POST /api/rooms/:roomId/scan?token=<jwt>` - Scan room QR (requireAuth)
- `DELETE /api/rooms/:roomId/occupancy` - Force clear occupancy (requireAdmin)
- `GET /api/rooms/qr/:roomId` - Generate QR PNG (requireAdmin)
- `GET /api/rooms/qr/bulk?from=401&to=412` - Download ZIP (requireAdmin)
- `GET /api/events` - SSE endpoint for real-time updates (requireAuth)

### Technical Details

- **Authentication**: Cookie-based (httpOnly, sameSite: "lax", secure: false)
- **QR Token**: JWT signed with `roomNumber` (e.g., 401, 402)
- **Occupancy Storage**: `room_scan_logs` collection with `roomId` (Number), `expiresAt` (Date)
- **Real-Time**: Server-Sent Events (SSE) for live status updates
- **Frontend**: Shared `api.js` axios client with `withCredentials: true`

## Project Structure

```
college-management-system/
├── backend/
│   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   ├── utils/
│   │   └── media/
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   └── utils/
│   └── public/
└── README.md
```

## For Any Doubt Feel Free To Contact Me 🚀

- [My Website](http://krishjotaniya.netlify.app/)
- [Linkedin](https://www.linkedin.com/in/krishjotaniya/)
- [krishjotaniya71@gmail.com](mailto:krishjotaniya71@gmail.com)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
