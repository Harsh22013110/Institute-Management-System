import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import Heading from "../../components/Heading";
import CustomButton from "../../components/CustomButton";
import axiosWrapper from "../../utils/AxiosWrapper";
import Loading from "../../components/Loading";
import NoData from "../../components/NoData";
import { baseApiURL } from "../../baseUrl";

const YEARS = [1, 2, 3, 4];

const Attendance = () => {
  const [activeTab, setActiveTab] = useState("attendance"); // 'attendance' | 'defaulters'
  const [branches, setBranches] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [records, setRecords] = useState([]);

  const [filters, setFilters] = useState({
    branch: "",
    year: "",
    minPercentage: "",
    maxPercentage: "",
    defaulterThreshold: 75,
  });

  const userToken = localStorage.getItem("userToken");
  const apiBase = baseApiURL();

  const fetchBranches = async () => {
    try {
      toast.loading("Loading branches...");
      const response = await axiosWrapper.get("/branch", {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (response.data.success) {
        setBranches(response.data.data);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setBranches([]);
      } else {
        toast.error(error.response?.data?.message || "Failed to load branches");
      }
    } finally {
      toast.dismiss();
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [userToken]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error("Please select an Excel file first");
      return;
    }

    try {
      toast.loading("Uploading attendance...");
      const formData = new FormData();
      formData.append("file", uploadFile);

      const response = await axiosWrapper.post("/attendance/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${userToken}`,
        },
      });

      toast.dismiss();
      if (response.data.success) {
        toast.success("Attendance uploaded");
        setUploadSummary(response.data.data);
      } else {
        toast.error(response.data.message || "Failed to upload attendance");
      }
    } catch (error) {
      toast.dismiss();
      toast.error(
        error.response?.data?.message || "Failed to upload attendance"
      );
    }
  };

  const fetchAttendance = async () => {
    setListLoading(true);
    setRecords([]);

    try {
      const params = new URLSearchParams();
      if (filters.branch) params.append("branch", filters.branch);
      if (filters.year) params.append("year", filters.year);
      if (filters.minPercentage)
        params.append("minPercentage", filters.minPercentage);
      if (filters.maxPercentage)
        params.append("maxPercentage", filters.maxPercentage);

      const response = await axiosWrapper.get(
        `/attendance?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      if (response.data.success) {
        setRecords(response.data.data || []);
      } else {
        toast.error(response.data.message || "Failed to load attendance");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load attendance"
      );
    } finally {
      setListLoading(false);
    }
  };

  const fetchDefaulters = async () => {
    setListLoading(true);
    setRecords([]);

    try {
      const params = new URLSearchParams();
      if (filters.branch) params.append("branch", filters.branch);
      if (filters.year) params.append("year", filters.year);
      if (filters.defaulterThreshold)
        params.append("threshold", filters.defaulterThreshold);

      const response = await axiosWrapper.get(
        `/attendance/defaulters?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      if (response.data.success) {
        setRecords(response.data.data || []);
      } else {
        toast.error(response.data.message || "Failed to load defaulters");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load defaulters"
      );
    } finally {
      setListLoading(false);
    }
  };

  const handleSearch = () => {
    if (activeTab === "attendance") {
      fetchAttendance();
    } else {
      fetchDefaulters();
    }
  };

  const handleDownloadDefaulters = () => {
    const params = new URLSearchParams();
    if (filters.branch) params.append("branch", filters.branch);
    if (filters.year) params.append("year", filters.year);
    if (filters.defaulterThreshold)
      params.append("threshold", filters.defaulterThreshold);
    if (filters.exportFormat)
      params.append("format", filters.exportFormat);

    const url = `${apiBase}/attendance/defaulters/export?${params.toString()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const renderTable = () => {
    if (listLoading) return <Loading />;

    if (!records || records.length === 0) {
      return (
        <NoData
          title={
            activeTab === "attendance"
              ? "No attendance records found"
              : "No defaulters found"
          }
        />
      );
    }

    return (
      <div className="w-full mt-8 overflow-x-auto">
        <table className="text-sm min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-blue-500 text-white">
              <th className="py-3 px-4 text-left font-semibold">
                Enrollment No
              </th>
              <th className="py-3 px-4 text-left font-semibold">Roll No</th>
              <th className="py-3 px-4 text-left font-semibold">Name</th>
              <th className="py-3 px-4 text-left font-semibold">Branch</th>
              <th className="py-3 px-4 text-left font-semibold">Year</th>
              <th className="py-3 px-4 text-left font-semibold">
                Attendance %
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec) => (
              <tr key={rec._id} className="border-t hover:bg-blue-50">
                <td className="py-3 px-4">{rec.enrollmentNo}</td>
                <td className="py-3 px-4">{rec.rollNo || "-"}</td>
                <td className="py-3 px-4">{rec.studentName || "-"}</td>
                <td className="py-3 px-4">{rec.branch || "-"}</td>
                <td className="py-3 px-4">{rec.year ?? "-"}</td>
                <td className="py-3 px-4">
                  {rec.attendancePercentage?.toFixed
                    ? rec.attendancePercentage.toFixed(2)
                    : rec.attendancePercentage ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="w-full mx-auto mt-10 flex justify-center items-start flex-col mb-10">
      <div className="flex justify-between items-center w-full mb-6">
        <Heading title="Attendance & Defaulters" />
      </div>

      {/* Upload Section */}
      <div className="w-full bg-white rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Upload Attendance Excel</h2>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={(e) => setUploadFile(e.target.files[0] || null)}
            className="w-full md:w-auto px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <CustomButton onClick={handleUpload} variant="primary">
            Upload
          </CustomButton>
        </div>
        {uploadSummary && (
          <div className="mt-4 text-sm text-gray-700">
            <p>
              Processed: <strong>{uploadSummary.processed}</strong>, Upserted:{" "}
              <strong>{uploadSummary.upserted}</strong>, Skipped:{" "}
              <strong>{uploadSummary.skipped}</strong>
            </p>
            {uploadSummary.errors && uploadSummary.errors.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-red-600">
                  View errors ({uploadSummary.errors.length})
                </summary>
                <ul className="list-disc list-inside mt-1 text-xs text-red-500 max-h-40 overflow-y-auto">
                  {uploadSummary.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="w-full flex gap-4 mb-4">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            activeTab === "attendance"
              ? "bg-blue-500 text-white"
              : "bg-blue-50 text-blue-700"
          }`}
          onClick={() => setActiveTab("attendance")}
        >
          Attendance
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            activeTab === "defaulters"
              ? "bg-blue-500 text-white"
              : "bg-blue-50 text-blue-700"
          }`}
          onClick={() => setActiveTab("defaulters")}
        >
          Defaulters
        </button>
      </div>

      {/* Filters */}
      <div className="w-full bg-white rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-[90%] mx-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch
            </label>
            <select
              name="branch"
              value={filters.branch}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <select
              name="year"
              value={filters.year}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Years</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </div>

          {activeTab === "attendance" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Attendance %
                </label>
                <input
                  type="number"
                  name="minPercentage"
                  value={filters.minPercentage}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Attendance %
                </label>
                <input
                  type="number"
                  name="maxPercentage"
                  value={filters.maxPercentage}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={0}
                  max={100}
                />
              </div>
            </>
          )}

          {activeTab === "defaulters" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Defaulter Threshold %
                </label>
                <input
                  type="number"
                  name="defaulterThreshold"
                  value={filters.defaulterThreshold}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Export Format
                </label>
                <select
                  name="exportFormat"
                  value={filters.exportFormat || "xlsx"}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="xlsx">Excel (.xlsx)</option>
                  <option value="csv">CSV (.csv)</option>
                  <option value="pdf">PDF (.pdf)</option>
                  <option value="docx">Word (.docx)</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-center gap-4 w-full">
          <CustomButton variant="primary" onClick={handleSearch}>
            Search
          </CustomButton>
          {activeTab === "defaulters" && (
            <CustomButton
              variant="secondary"
              onClick={handleDownloadDefaulters}
            >
              Download Defaulters (CSV)
            </CustomButton>
          )}
        </div>
      </div>

      {renderTable()}
    </div>
  );
};

export default Attendance;

