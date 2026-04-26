import React, { useEffect, useState, useRef } from "react";
import { toast } from "react-hot-toast";
import { MdOutlineDelete, MdEdit, MdMoreVert } from "react-icons/md";
import { IoMdAdd, IoMdClose } from "react-icons/io";
import api from "../../api";
import axiosWrapper from "../../utils/AxiosWrapper";
import Heading from "../../components/Heading";
import DeleteConfirm from "../../components/DeleteConfirm";
import CustomButton from "../../components/CustomButton";
import Loading from "../../components/Loading";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import duration from "dayjs/plugin/duration";

dayjs.extend(relativeTime);
dayjs.extend(duration);

const Classroom = () => {
  const [data, setData] = useState({
    roomNumber: "",
    capacity: 50,
    floor: 4,
    status: "available",
  });
  const [classrooms, setClassrooms] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isClearOccupancyOpen, setIsClearOccupancyOpen] = useState(false);
  const [selectedClassroomId, setSelectedClassroomId] = useState(null);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState(null); // For occupancy operations
  const [isEditing, setIsEditing] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);
  const [countdowns, setCountdowns] = useState({});
  const shownErrors = useRef(new Set());
  const eventSourceRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Error deduplication helper - only toast once per error key
  const toastOnce = (key, msg) => {
    if (!shownErrors.current.has(key)) {
      shownErrors.current.add(key);
      toast.error(msg);
    } else {
      // Log to console instead of showing toast again
      console.warn(`[Suppressed duplicate error] ${key}: ${msg}`);
    }
  };

  useEffect(() => {
    getClassroomHandler();
    connectSSE();

    // Update countdowns every second
    countdownIntervalRef.current = setInterval(() => {
      updateCountdowns();
    }, 1000);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const connectSSE = () => {
    // Get base URL from environment
    const apiLink = process.env.REACT_APP_APILINK || "http://10.148.86.146:4000/api";
    const baseUrl = apiLink.replace("/api", "");
    // EventSource doesn't support withCredentials, but cookies are sent automatically for same-origin
    // For cross-origin, we may need to pass token in query (but cookies should work with CORS)
    const token = localStorage.getItem("userToken");
    const eventSource = new EventSource(`${baseUrl}/api/events${token ? `?token=${token}` : ""}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "room.status.changed") {
          handleRoomStatusUpdate(data.data);
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    };

    eventSource.onerror = (error) => {
      // Don't toast SSE errors - log only
      console.error("SSE connection error:", error);
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        connectSSE();
      }, 3000);
    };

    eventSourceRef.current = eventSource;
  };

  const handleRoomStatusUpdate = (updateData) => {
    setClassrooms((prev) =>
      prev.map((room) => {
        // Update by roomNumber (roomId in SSE is roomNumber)
        const roomNum = parseInt(room.roomNumber, 10);
        const updateRoomNum = typeof updateData.roomId === "number" 
          ? updateData.roomId 
          : parseInt(updateData.roomId, 10);
        
        // Match by roomNumber (primary) or _id (fallback for backward compat)
        if (roomNum === updateRoomNum || (updateData.roomId && room._id === updateData.roomId)) {
          return {
            ...room,
            occupancyStatus: updateData.status,
            occupiedUntil: updateData.occupiedUntil,
          };
        }
        return room;
      })
    );
    updateCountdowns();
  };

  const updateCountdowns = () => {
    const newCountdowns = {};
    classrooms.forEach((room) => {
      if (room.occupiedUntil) {
        const now = dayjs();
        const until = dayjs(room.occupiedUntil);
        const diff = until.diff(now, "second");
        // Use roomNumber as key for consistency
        const key = room.roomNumber || room._id;

        if (diff > 0) {
          const minutes = Math.floor(diff / 60);
          const seconds = diff % 60;
          newCountdowns[key] = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        } else {
          newCountdowns[key] = "00:00";
          // Status should auto-update via SSE, but refresh if needed (silently, no toast)
          if (room.occupancyStatus === "Occupied") {
            // Silently refresh without showing errors
            getClassroomHandler().catch((err) => {
              console.warn("Background refresh failed (expected if room expired):", err);
            });
          }
        }
      }
    });
    setCountdowns(newCountdowns);
  };

  const getClassroomHandler = async () => {
    setDataLoading(true);
    try {
      const response = await api.get(`/classrooms`);
      if (response.data.success) {
        setClassrooms(response.data.data);
        updateCountdowns();
      } else {
        // Only toast on user-initiated actions, not background polling
        if (!dataLoading) {
          toast.error(response.data.message);
        } else {
          console.error("Error fetching classrooms:", response.data.message);
        }
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setClassrooms([]);
        return;
      }
      console.error("Error fetching classrooms:", error);
      // Don't toast for background errors - log only
      // Only toast if it's explicitly a user-initiated action
      // Background polling/SSE errors should not show toasts
      if (error.response?.data?.message) {
        console.error("Error message:", error.response.data.message);
      }
    } finally {
      setDataLoading(false);
    }
  };

  const addClassroomHandler = async () => {
    if (!data.roomNumber || !data.capacity) {
      toast.dismiss();
      toast.error("Please fill all the required fields");
      return;
    }
    try {
      toast.loading(isEditing ? "Updating Classroom" : "Adding Classroom");
      let response;
      if (isEditing) {
        response = await axiosWrapper.patch(
          `/classroom/${selectedClassroomId}`,
          data
        );
      } else {
        response = await axiosWrapper.post(`/classroom`, data);
      }
      toast.dismiss();
      if (response.data.success) {
        toast.success(response.data.message);
        setData({ roomNumber: "", capacity: 50, floor: 4, status: "available" });
        setShowAddForm(false);
        setIsEditing(false);
        setSelectedClassroomId(null);
        getClassroomHandler();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.message || "Error processing request");
    }
  };

  const deleteClassroomHandler = async (id) => {
    setIsDeleteConfirmOpen(true);
    setSelectedClassroomId(id);
  };

  const clearOccupancyHandler = async (roomNumber) => {
    setIsClearOccupancyOpen(true);
    setSelectedRoomNumber(roomNumber);
  };

  const confirmClearOccupancy = async () => {
    if (!selectedRoomNumber) {
      toast.error("No room selected");
      return;
    }
    try {
      toast.loading("Clearing occupancy");
      const response = await api.delete(
        `/rooms/${selectedRoomNumber}/occupancy`
      );
      toast.dismiss();
      if (response.data.success) {
        toast.success("Room occupancy cleared successfully");
        setIsClearOccupancyOpen(false);
        setSelectedRoomNumber(null);
        getClassroomHandler();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.dismiss();
      if (error.response?.status === 404) {
        toastOnce(`room-not-found-${selectedRoomNumber}`, `Room ${selectedRoomNumber} not found`);
      } else {
        toast.error(error.response?.data?.message || "Error clearing occupancy");
      }
    }
  };

  const editClassroomHandler = (classroom) => {
    setData({
      roomNumber: classroom.roomNumber,
      capacity: classroom.capacity,
      floor: classroom.floor,
      status: classroom.status,
    });
    setSelectedClassroomId(classroom._id);
    setIsEditing(true);
    setShowAddForm(true);
  };

  const confirmDelete = async () => {
    try {
      toast.loading("Deleting Classroom");
      const response = await axiosWrapper.delete(
        `/classroom/${selectedClassroomId}`
      );
      toast.dismiss();
      if (response.data.success) {
        toast.success("Classroom has been deleted successfully");
        setIsDeleteConfirmOpen(false);
        getClassroomHandler();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.message || "Error deleting classroom");
    }
  };

  const getOccupancyStatusColor = (status) => {
    switch (status) {
      case "Occupied":
        return "bg-red-100 text-red-800";
      case "Available":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getManualStatusColor = (status) => {
    switch (status) {
      case "available":
        return "bg-blue-100 text-blue-800";
      case "occupied":
        return "bg-orange-100 text-orange-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="w-full mx-auto mt-10 flex justify-center items-start flex-col mb-10 relative">
      <div className="flex justify-between items-center w-full mb-4">
        <Heading title="Classroom Management" />
        <CustomButton
          onClick={async () => {
            try {
              toast.loading("Generating QR codes...");
              const resp = await api.get("/rooms/qr/bulk", {
                params: { from: 401, to: 412 },
                responseType: "blob",
              });

              // Check if response is a blob
              if (resp.data instanceof Blob) {
                // Check content type
                const contentType = resp.headers["content-type"] || resp.data.type;
                
                if (contentType && contentType.includes("application/zip")) {
                  // Create blob URL and download
                  const url = URL.createObjectURL(resp.data);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "room-qrs.zip";
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                  toast.dismiss();
                  toast.success("QR codes downloaded successfully!");
                } else {
                  // Might be an error JSON in blob format
                  const text = await resp.data.text();
                  try {
                    const errorData = JSON.parse(text);
                    toast.dismiss();
                    toast.error(errorData.message || "Failed to download QR codes");
                  } catch {
                    toast.dismiss();
                    toast.error("Failed to download QR codes: Invalid response format");
                  }
                }
              } else {
                toast.dismiss();
                toast.error("Failed to download QR codes: Invalid response");
              }
            } catch (error) {
              console.error("Download QR error:", error);
              toast.dismiss();
              
              // Handle blob error responses
              if (error.response?.data instanceof Blob) {
                try {
                  const text = await error.response.data.text();
                  const errorData = JSON.parse(text);
                  toastOnce("qr-download-error", errorData.message || "Failed to download QR codes");
                } catch {
                  toastOnce("qr-download-error", "Failed to download QR codes");
                }
              } else if (error.response?.status === 401 || error.response?.status === 403) {
                toastOnce("qr-download-auth", "Login as admin to download QR codes");
              } else if (error.response?.status === 404) {
                toastOnce("qr-download-not-found", error.response.data?.message || "Rooms not found. Please run the classroom seeder first.");
              } else if (error.response?.data?.message) {
                toastOnce("qr-download-error", error.response.data.message);
              } else {
                toastOnce("qr-download-error", "Failed to download QR codes. Please try again.");
              }
            }
          }}
          variant="secondary"
        >
          Download All QR Codes
        </CustomButton>
      </div>
      <CustomButton
        onClick={() => {
          setShowAddForm(!showAddForm);
          if (!showAddForm) {
            setData({ roomNumber: "", capacity: 50, floor: 4, status: "available" });
            setIsEditing(false);
            setSelectedClassroomId(null);
          }
        }}
        className="fixed bottom-8 right-8 !rounded-full !p-4"
      >
        {showAddForm ? (
          <IoMdClose className="text-3xl" />
        ) : (
          <IoMdAdd className="text-3xl" />
        )}
      </CustomButton>

      {dataLoading && <Loading />}

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg w-[500px] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">
                {isEditing ? "Edit Classroom" : "Add New Classroom"}
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <IoMdClose className="text-3xl" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); addClassroomHandler(); }} className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="roomNumber"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Room Number *
                </label>
                <input
                  type="text"
                  id="roomNumber"
                  value={data.roomNumber}
                  onChange={(e) => setData({ ...data, roomNumber: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="capacity"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Capacity *
                </label>
                <input
                  type="number"
                  id="capacity"
                  value={data.capacity}
                  onChange={(e) => setData({ ...data, capacity: parseInt(e.target.value) || 50 })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="floor"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Floor
                </label>
                <input
                  type="number"
                  id="floor"
                  value={data.floor}
                  onChange={(e) => setData({ ...data, floor: parseInt(e.target.value) || 4 })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Manual Status
                </label>
                <select
                  id="status"
                  value={data.status}
                  onChange={(e) => setData({ ...data, status: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <CustomButton
                  variant="secondary"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </CustomButton>
                <CustomButton variant="primary" onClick={addClassroomHandler}>
                  {isEditing ? "Update" : "Add"}
                </CustomButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {!dataLoading && (
        <div className="mt-8 w-full">
          <table className="text-sm min-w-full bg-white">
            <thead>
              <tr className="bg-blue-500 text-white">
                <th className="py-4 px-6 text-left font-semibold">
                  Room Number
                </th>
                <th className="py-4 px-6 text-left font-semibold">Capacity</th>
                <th className="py-4 px-6 text-left font-semibold">Floor</th>
                <th className="py-4 px-6 text-left font-semibold">Occupancy Status</th>
                <th className="py-4 px-6 text-left font-semibold">Manual Status</th>
                <th className="py-4 px-6 text-left font-semibold">
                  Created At
                </th>
                <th className="py-4 px-6 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classrooms && classrooms.length > 0 ? (
                classrooms.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-blue-50">
                    <td className="py-4 px-6 font-medium">{item.roomNumber}</td>
                    <td className="py-4 px-6">{item.capacity}</td>
                    <td className="py-4 px-6">{item.floor}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getOccupancyStatusColor(item.occupancyStatus || "Available")}`}>
                          {item.occupancyStatus || "Available"}
                        </span>
                        {item.occupancyStatus === "Occupied" && item.occupiedUntil && (
                          <span className="text-xs text-gray-600 font-mono">
                            {countdowns[item.roomNumber] || countdowns[item._id] || "00:00"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getManualStatusColor(item.status)}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {new Date(item.createdAt).toLocaleDateString("en-GB")}
                    </td>
                    <td className="py-4 px-6 text-center flex justify-center gap-2">
                      <CustomButton
                        variant="secondary"
                        className="!p-2"
                        onClick={() => editClassroomHandler(item)}
                        title="Edit"
                      >
                        <MdEdit />
                      </CustomButton>
                      <div className="relative group">
                        <CustomButton
                          variant="secondary"
                          className="!p-2"
                          title="More options"
                        >
                          <MdMoreVert />
                        </CustomButton>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                          <div className="py-1">
                            <button
                              onClick={() => clearOccupancyHandler(item.roomNumber)}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              Force Clear Occupancy
                            </button>
                            <button
                              onClick={() => deleteClassroomHandler(item._id)}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              Delete Classroom
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center text-base pt-10">
                    No classrooms found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <DeleteConfirm
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        message="Are you sure you want to delete this classroom?"
      />
      <DeleteConfirm
        isOpen={isClearOccupancyOpen}
        onClose={() => setIsClearOccupancyOpen(false)}
        onConfirm={confirmClearOccupancy}
        message="Are you sure you want to force clear the occupancy for this room?"
      />
    </div>
  );
};

export default Classroom;
