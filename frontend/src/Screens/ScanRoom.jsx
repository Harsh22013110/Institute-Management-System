import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api";
import CustomButton from "../components/CustomButton";
import Loading from "../components/Loading";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import duration from "dayjs/plugin/duration";

dayjs.extend(relativeTime);
dayjs.extend(duration);

const ScanRoom = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomId = searchParams.get("roomId");
  const token = searchParams.get("token");
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    // Check if user is logged in by trying to access a protected endpoint
    // If not logged in, redirect to login
    const checkAuth = async () => {
      try {
        // Try to get classrooms to verify auth
        await api.get("/classrooms");
        validateAndLoadRoom();
      } catch (error) {
        if (error.response?.status === 401) {
          // Not logged in, redirect to login
          const returnUrl = `/scan/room?roomId=${roomId}&token=${token}`;
          localStorage.setItem("returnUrl", returnUrl);
          navigate("/");
        } else {
          validateAndLoadRoom();
        }
      }
    };

    if (roomId && token) {
      checkAuth();
    } else {
      toast.error("Invalid QR code. Missing room ID or token.");
      setLoading(false);
    }
  }, [roomId, token, navigate]);

  useEffect(() => {
    if (scanResult?.expiresAt) {
      const interval = setInterval(() => {
        const now = dayjs();
        const expires = dayjs(scanResult.expiresAt);
        const diff = expires.diff(now, "second");

        if (diff > 0) {
          const minutes = Math.floor(diff / 60);
          const seconds = diff % 60;
          setCountdown(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
        } else {
          setCountdown("00:00");
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [scanResult]);

  const validateAndLoadRoom = async () => {
    if (!roomId || !token) {
      toast.error("Invalid QR code. Missing room ID or token.");
      setLoading(false);
      return;
    }

    try {
      // roomId from query string is the roomNumber (e.g., "401")
      // Get all classrooms and find the one matching this roomNumber
      const response = await api.get("/classrooms");
      const rooms = response.data.data || [];
      
      // Match by roomNumber (primary identifier for occupancy/scan endpoints)
      const roomIdNum = parseInt(roomId, 10);
      const room = rooms.find((r) => {
        const rNum = parseInt(r.roomNumber, 10);
        return rNum === roomIdNum || r.roomNumber === roomId.toString();
      });
      
      if (room) {
        setRoomData(room);
        console.log(`Found room: ${room.roomNumber}`);
      } else {
        console.error(`Room not found. Looking for roomNumber: ${roomId}, Available rooms:`, rooms.map(r => r.roomNumber));
        toast.error(`Room ${roomId} not found or invalid QR code`);
      }
    } catch (error) {
      console.error("Error validating room:", error);
      if (error.response?.status === 401) {
        toast.error("Please login to continue");
        navigate("/");
      } else {
        toast.error("Invalid QR code or room not found");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    if (!roomId || !token) {
      toast.error("Invalid QR code");
      return;
    }

    setScanning(true);
    try {
      const response = await api.post(
        `/rooms/${roomId}/scan`,
        null,
        { params: { token } }
      );

      if (response.data.success) {
        setScanResult(response.data.data);
        toast.success("Room marked as occupied for 1 hour!");
      } else {
        toast.error(response.data.message || "Failed to scan room");
      }
    } catch (error) {
      console.error("Scan error:", error);
      if (error.response?.status === 401) {
        toast.error("Please login to continue");
        navigate("/");
      } else if (error.response?.status === 400) {
        toast.error(error.response.data.message || "Invalid or mismatched QR token");
      } else if (error.response?.status === 429) {
        toast.error("Rate limit exceeded. Please wait a moment.");
      } else {
        toast.error(error.response?.data?.message || "Failed to scan room");
      }
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid QR Code</h1>
          <p className="text-gray-600 mb-6">
            The QR code you scanned is invalid or the room does not exist.
          </p>
          <CustomButton onClick={() => navigate("/")} variant="primary">
            Go to Login
          </CustomButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {!scanResult ? (
          <>
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Room {roomData.roomNumber}
              </h1>
              <p className="text-gray-600">
                Confirm occupancy for 1 hour
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Capacity:</strong> {roomData.capacity} students
              </p>
              <p className="text-sm text-blue-800">
                <strong>Floor:</strong> {roomData.floor}
              </p>
            </div>

            <CustomButton
              onClick={handleScan}
              disabled={scanning}
              variant="primary"
              className="w-full py-3 text-lg"
            >
              {scanning ? "Processing..." : "Confirm Occupy for 1 Hour"}
            </CustomButton>
          </>
        ) : (
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">
                Room Occupied!
              </h2>
              <p className="text-gray-600 mb-4">
                Room {roomData.roomNumber} is now marked as occupied
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">Expires at:</p>
              <p className="text-lg font-semibold text-gray-900">
                {dayjs(scanResult.expiresAt).format("DD/MM/YYYY HH:mm:ss")}
              </p>
              {countdown && (
                <p className="text-2xl font-mono text-blue-600 mt-2">
                  {countdown}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <CustomButton
                onClick={handleScan}
                disabled={scanning}
                variant="primary"
                className="w-full"
              >
                {scanning ? "Extending..." : "Extend by 1 Hour"}
              </CustomButton>
              <CustomButton
                onClick={() => {
                  setScanResult(null);
                  navigate("/");
                }}
                variant="secondary"
                className="w-full"
              >
                Done
              </CustomButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanRoom;
