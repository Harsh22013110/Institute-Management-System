const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const PDFDocument = require("pdfkit");
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun } = require("docx");
const Attendance = require("../models/attendance.model");
const StudentDetail = require("../models/details/student-details.model");
const ApiResponse = require("../utils/ApiResponse");

function normalizeHeader(header) {
  if (!header) return "";
  return String(header).trim().toLowerCase().replace(/\s+/g, "_");
}

function getCellValue(row, possibleHeaders) {
  const normalized = {};
  for (const key of Object.keys(row)) {
    normalized[normalizeHeader(key)] = row[key];
  }
  for (const header of possibleHeaders) {
    const norm = normalizeHeader(header);
    if (normalized.hasOwnProperty(norm)) {
      return normalized[norm];
    }
  }
  return undefined;
}

function toCleanString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

// Specifically for the "Year" column, support values like "2", "Year 2", "2nd Year", etc.
function parseYear(value) {
  const str = toCleanString(value);
  if (!str) return 0;
  const match = str.match(/\d+/);
  if (!match) return 0;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : 0;
}

// POST /api/attendance/upload
const uploadAttendanceController = async (req, res) => {
  if (!req.file) {
    return ApiResponse.badRequest("Attendance Excel file is required").send(res);
  }

  const filePath = req.file.path;

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    let processed = 0;
    let upserted = 0;
    let skipped = 0;
    const errors = [];

    console.log(
      "[Attendance Upload] Incoming rows:",
      rows.length,
      "sample headers:",
      rows[0] ? Object.keys(rows[0]) : []
    );

    for (const [index, row] of rows.entries()) {
      processed += 1;

      const enrollmentRaw = getCellValue(row, ["Enrollment_No", "enrollment_no", "EnrollmentNo"]);
      const enrollmentNo = toCleanString(enrollmentRaw);

      if (!enrollmentNo) {
        skipped += 1;
        errors.push(`Row ${index + 2}: Missing Enrollment_No`);
        continue;
      }

      const rollRaw = getCellValue(row, ["Roll_No", "roll_no", "RollNo"]);
      const rollNo = toCleanString(rollRaw) || undefined;

      const studentName = toCleanString(
        getCellValue(row, ["Student_Name", "student_name", "Name"])
      );
      const branch = toCleanString(getCellValue(row, ["Branch", "branch"]));
      const year = parseYear(getCellValue(row, ["Year", "year"]));
      const totalClasses = toNumber(
        getCellValue(row, ["Total_Classes", "total_classes", "TotalClasses"])
      );
      const attendedClasses = toNumber(
        getCellValue(row, ["Attended_Classes", "attended_classes", "AttendedClasses"])
      );

      const attendancePercentage =
        totalClasses > 0
          ? Math.round((attendedClasses / totalClasses) * 10000) / 100
          : 0;

      try {
        await Attendance.findOneAndUpdate(
          {
            enrollmentNo,
            branch,
            year,
          },
          {
            $set: {
              enrollmentNo,
              rollNo,
              studentName,
              branch,
              year,
              totalClasses,
              attendedClasses,
              attendancePercentage,
              uploadedBy: req.userId,
              uploadedAt: new Date(),
            },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );
        upserted += 1;
      } catch (err) {
        skipped += 1;
        errors.push(`Row ${index + 2}: ${err.message}`);
      }
    }

    // Debug: log distinct branch/year combinations we actually stored
    const distinctCombos = await Attendance.aggregate([
      {
        $group: {
          _id: { branch: "$branch", year: "$year" },
          count: { $sum: 1 },
        },
      },
    ]);
    console.log("[Attendance Upload] Stored branch/year combos:", distinctCombos);

    return ApiResponse.success(
      {
        processed,
        upserted,
        skipped,
        errors,
      },
      "Attendance uploaded successfully"
    ).send(res);
  } catch (error) {
    console.error("Upload Attendance Error:", error);
    return ApiResponse.internalServerError().send(res);
  } finally {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // ignore file cleanup errors
    }
  }
};

// GET /api/attendance
const getAttendanceController = async (req, res) => {
  try {
    const { branch, year, minPercentage, maxPercentage } = req.query;
    const query = {};

    if (branch) query.branch = toCleanString(branch);
    if (year) query.year = Number(year);

    const min = minPercentage !== undefined ? Number(minPercentage) : undefined;
    const max = maxPercentage !== undefined ? Number(maxPercentage) : undefined;

    if (min !== undefined || max !== undefined) {
      query.attendancePercentage = {};
      if (min !== undefined) query.attendancePercentage.$gte = min;
      if (max !== undefined) query.attendancePercentage.$lte = max;
    }

    console.log("[Attendance List] Query:", query);

    const records = await Attendance.find(query).sort({
      enrollmentNo: 1,
      year: 1,
    });

    return ApiResponse.success(records, "Attendance list loaded").send(res);
  } catch (error) {
    console.error("Get Attendance Error:", error);
    return ApiResponse.internalServerError().send(res);
  }
};

// GET /api/attendance/defaulters
const getDefaultersController = async (req, res) => {
  try {
    const { branch, year, threshold = 75 } = req.query;
    const query = {
      attendancePercentage: { $lt: Number(threshold) },
    };

    if (branch) query.branch = toCleanString(branch);
    if (year) query.year = Number(year);

    console.log("[Defaulters List] Query:", query);

    const records = await Attendance.find(query).sort({
      attendancePercentage: 1,
    });

    return ApiResponse.success(records, "Defaulters list loaded").send(res);
  } catch (error) {
    console.error("Get Defaulters Error:", error);
    return ApiResponse.internalServerError().send(res);
  }
};

// GET /api/attendance/defaulters/export (CSV / Excel / PDF / Word)
const exportDefaultersController = async (req, res) => {
  try {
    const { branch, year, threshold = 75, format = "xlsx" } = req.query;
    const query = {
      attendancePercentage: { $lt: Number(threshold) },
    };

    if (branch) query.branch = toCleanString(branch);
    if (year) query.year = Number(year);

    const records = await Attendance.find(query).sort({
      attendancePercentage: 1,
    });

    console.log("[Defaulters Export] Query:", query, "records:", records.length);

    const rows = records.map((rec) => ({
      Enrollment_No: rec.enrollmentNo,
      Roll_No: rec.rollNo || "",
      Student_Name: rec.studentName || "",
      Branch: rec.branch || "",
      Year: rec.year ?? "",
      Total_Classes: rec.totalClasses ?? "",
      Attended_Classes: rec.attendedClasses ?? "",
      Attendance_Percentage: rec.attendancePercentage ?? "",
    }));

    const fmt = String(format).toLowerCase();

    if (fmt === "csv") {
      const headers = Object.keys(rows[0] || {});
      const escapeCsv = (value) => {
        const str = value === undefined || value === null ? "" : String(value);
        if (/[",\n]/.test(str)) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      const csvLines = [
        headers.join(","),
        ...rows.map((row) =>
          headers.map((h) => escapeCsv(row[h])).join(",")
        ),
      ];
      const csvContent = csvLines.join("\n");
      const filename = `defaulters-${Date.now()}.csv`;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      return res.send(csvContent);
    }

    if (fmt === "xlsx" || fmt === "excel") {
      const workbook = xlsx.utils.book_new();
      const sheet = xlsx.utils.json_to_sheet(rows);
      xlsx.utils.book_append_sheet(workbook, sheet, "Defaulters");
      const buffer = xlsx.write(workbook, {
        bookType: "xlsx",
        type: "buffer",
      });
      const filename = `defaulters-${Date.now()}.xlsx`;
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      return res.send(buffer);
    }

    if (fmt === "pdf") {
      const filename = `defaulters-${Date.now()}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      const doc = new PDFDocument({ margin: 40, size: "A4" });
      doc.pipe(res);

      // Title
      doc.fontSize(16).text("Defaulters List", { align: "center" });
      doc.moveDown(1.5);

      // Simple tabular layout
      const startX = doc.page.margins.left;
      let currentY = doc.y;

      // Adjusted widths so "Attendance %" fits in one line
      const colWidths = [80, 60, 150, 120, 40, 90];
      const headersPdf = [
        "Enrollment No",
        "Roll No",
        "Name",
        "Branch",
        "Year",
        "Attendance %",
      ];

      const drawRow = (values, isHeader = false) => {
        const fontSize = isHeader ? 11 : 10;
        const rowHeight = 20;
        let x = startX;

        // Draw cell borders for a clean table look
        values.forEach((_, idx) => {
          doc
            .rect(x, currentY, colWidths[idx], rowHeight)
            .strokeColor("#e5e7eb")
            .stroke();
          x += colWidths[idx];
        });

        // Draw text inside cells
        doc.fontSize(fontSize);
        x = startX;
        values.forEach((val, idx) => {
          const text = val != null ? String(val) : "";
          doc.text(text, x + 4, currentY + 6, {
            width: colWidths[idx] - 8,
            continued: false,
          });
          x += colWidths[idx];
        });

        currentY += rowHeight;
      };

      // Header row
      doc.strokeColor("#9ca3af");
      drawRow(headersPdf, true);

      // Data rows
      rows.forEach((row) => {
        if (currentY > doc.page.height - doc.page.margins.bottom - 40) {
          doc.addPage();
          currentY = doc.page.margins.top;
          drawRow(headersPdf, true);
        }
        drawRow(
          [
            row.Enrollment_No,
            row.Roll_No || "-",
            row.Student_Name || "-",
            row.Branch || "-",
            row.Year || "-",
            `${row.Attendance_Percentage ?? 0}%`,
          ],
          false
        );
      });

      doc.end();
      return;
    }

    if (fmt === "docx" || fmt === "word") {
      const headers = Object.keys(rows[0] || {});
      const tableRows = [
        new TableRow({
          children: headers.map(
            (h) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun(h)] })],
              })
          ),
        }),
        ...rows.map(
          (row) =>
            new TableRow({
              children: headers.map(
                (h) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new TextRun(row[h] != null ? String(row[h]) : "")],
                      }),
                    ],
                  })
              ),
            })
        ),
      ];

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Defaulters List", bold: true })],
              }),
              new Table({ rows: tableRows }),
            ],
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);
      const filename = `defaulters-${Date.now()}.docx`;
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      return res.send(buffer);
    }

    // Default to Excel if unknown format
    const workbook = xlsx.utils.book_new();
    const sheet = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(workbook, sheet, "Defaulters");
    const buffer = xlsx.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });
    const filename = `defaulters-${Date.now()}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    return res.send(buffer);
  } catch (error) {
    console.error("Export Defaulters Error:", error);
    return ApiResponse.internalServerError().send(res);
  }
};

// GET /api/attendance/me
const getMyAttendanceController = async (req, res) => {
  try {
    const student = await StudentDetail.findById(req.userId);

    if (!student) {
      return ApiResponse.notFound("Student not found").send(res);
    }

    const enrollmentNo = String(student.enrollmentNo).trim();

    const records = await Attendance.find({ enrollmentNo }).sort({
      year: 1,
    });

    return ApiResponse.success(records, "My attendance loaded").send(res);
  } catch (error) {
    console.error("Get My Attendance Error:", error);
    return ApiResponse.internalServerError().send(res);
  }
};

module.exports = {
  uploadAttendanceController,
  getAttendanceController,
  getDefaultersController,
  getMyAttendanceController,
  exportDefaultersController,
};

