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

## QR Code-Based Classroom Occupancy

The system includes a QR code-based classroom occupancy tracking feature:

### Features
- **QR Code Scanning**: Each room (401-412) has a unique signed QR code
- **1-Hour Occupancy**: Scanning marks a room as occupied for exactly 1 hour
- **Auto-Extension**: Re-scanning within the hour extends occupancy by another hour
- **Real-Time Updates**: Live status updates via Server-Sent Events (SSE)
- **Live Countdown**: Shows remaining time until occupancy expires
- **Force Clear**: Admins can manually clear room occupancy

### Downloading QR Codes

1. **Via Admin Dashboard** (Recommended):
   - Login as admin
   - Navigate to Admin → Classroom
   - Click "Download All QR Codes" button
   - This downloads a ZIP file (`room-qrs-401-412.zip`) with QR codes for rooms 401-412
   - **Note:** You must be logged in as admin. The download uses cookies for authentication.

2. **Via Script**:
   ```bash
   cd backend
   # Set ADMIN_TOKEN in .env or export it
   export ADMIN_TOKEN=your_admin_jwt_token
   node scripts/generate-room-qrs.js
   ```
   QR codes will be saved to `backend/exports/room-qrs/`

### Using QR Codes

1. Print the QR codes and post them in respective classrooms
2. Teachers scan the QR code with their phone
3. If not logged in, they're redirected to login
4. After login, they see the room details
5. Click "Confirm Occupy for 1 Hour"
6. Room is marked as occupied for 1 hour
7. Status updates in real-time on the admin dashboard

### Viewing Occupancy Status

- Navigate to Admin → Classroom
- View the "Occupancy Status" column:
  - **Available** (green) - Room is free
  - **Occupied** (red) - Room is occupied with countdown timer (MM:SS)
- Status updates automatically via SSE

### API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/rooms/:roomId/scan?token=<jwt>` - Scan a room QR code
- `GET /api/classrooms` - Get all classrooms with occupancy status
- `DELETE /api/rooms/:roomId/occupancy` - Force clear occupancy (admin only)
- `GET /api/rooms/qr/:roomId` - Generate QR code PNG for a room (admin only)
- `GET /api/rooms/qr/bulk?from=401&to=412` - Download ZIP of all QR codes (admin only)
- `GET /api/events` - SSE endpoint for real-time room status updates

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
