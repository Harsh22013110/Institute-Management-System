import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import Heading from "../../components/Heading";
import CustomButton from "../../components/CustomButton";
import axiosWrapper from "../../utils/AxiosWrapper";
import Loading from "../../components/Loading";
import NoData from "../../components/NoData";
import { baseApiURL } from "../../baseUrl";

const YEARS = [1, 2, 3, 4];

const Defaulters = () => {
  const [branches, setBranches] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    branch: "",
    year: "",
    defaulterThreshold: 75,
    exportFormat: "xlsx",
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

  const fetchDefaulters = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const params = new URLSearchParams();
    if (filters.branch) params.append("branch", filters.branch);
    if (filters.year) params.append("year", filters.year);
    if (filters.defaulterThreshold)
      params.append("threshold", filters.defaulterThreshold);
    if (filters.exportFormat) params.append("format", filters.exportFormat);

    const url = `${apiBase}/attendance/defaulters/export?${params.toString()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const renderTable = () => {
    if (loading) return <Loading />;
    if (!records || records.length === 0) {
      return <NoData title="No defaulters found" />;
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
        <Heading title="Defaulters" />
      </div>

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
              value={filters.exportFormat}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
              <option value="pdf">PDF (.pdf)</option>
              <option value="docx">Word (.docx)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-4 w-full">
          <CustomButton variant="primary" onClick={fetchDefaulters}>
            Search
          </CustomButton>
          <CustomButton variant="secondary" onClick={handleDownload}>
            Download Defaulters (CSV)
          </CustomButton>
        </div>
      </div>

      {renderTable()}
    </div>
  );
};

export default Defaulters;

