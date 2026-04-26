import React, { useEffect, useState } from "react";
import Heading from "../../components/Heading";
import axiosWrapper from "../../utils/AxiosWrapper";
import Loading from "../../components/Loading";
import NoData from "../../components/NoData";

const StudentAttendance = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMyAttendance = async () => {
    setLoading(true);
    setRecords([]);
    try {
      const response = await axiosWrapper.get("/attendance/me");
      if (response.data.success) {
        setRecords(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching attendance", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAttendance();
  }, []);

  if (loading) {
    return <Loading />;
  }

  if (!records || records.length === 0) {
    return (
      <div className="w-full mx-auto mt-10 flex justify-center items-start flex-col mb-10">
        <Heading title="My Attendance" />
        <NoData title="No attendance records available" />
      </div>
    );
  }

  return (
    <div className="w-full mx-auto mt-10 flex justify-center items-start flex-col mb-10">
      <Heading title="My Attendance" />
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
    </div>
  );
};

export default StudentAttendance;

