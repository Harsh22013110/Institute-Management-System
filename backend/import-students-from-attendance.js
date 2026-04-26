require("dotenv").config();
const path = require("path");
const mongoose = require("mongoose");
const xlsx = require("xlsx");
const connectToMongo = require("./Database/db");
const Branch = require("./models/branch.model");
const StudentDetail = require("./models/details/student-details.model");

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

function parseYear(value) {
  const str = toCleanString(value);
  if (!str) return 0;
  const match = str.match(/\d+/);
  if (!match) return 0;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : 0;
}

// Map academic year to the FIRST semester of that year:
// Year 1 -> Sem 1, Year 2 -> Sem 3, Year 3 -> Sem 5, Year 4 -> Sem 7
function yearToSemester(yearNumber) {
  if (!yearNumber || !Number.isFinite(yearNumber)) return 1;
  const sem = (yearNumber - 1) * 2 + 1;
  return sem > 0 ? sem : 1;
}

async function getOrCreateBranch(branchName) {
  const name = toCleanString(branchName);
  if (!name) return null;

  let branch = await Branch.findOne({ name });
  if (branch) return branch;

  // Create a simple branchId code from initials
  const code =
    name
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("") || "GEN";

  branch = await Branch.create({
    branchId: code,
    name,
  });

  return branch;
}

async function main() {
  try {
    const filePath = process.argv[2];
    if (!filePath) {
      console.error(
        "Usage: node import-students-from-attendance.js <path-to-attendance-xlsx>"
      );
      process.exit(1);
    }

    const resolvedPath = path.resolve(filePath);
    console.log("Reading attendance file:", resolvedPath);

    await connectToMongo();
    console.log("Connected to MongoDB");

    const workbook = xlsx.readFile(resolvedPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    console.log("Total rows in sheet:", rows.length);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const [index, row] of rows.entries()) {
      const enrollmentRaw = getCellValue(row, [
        "Enrollment_No",
        "enrollment_no",
        "EnrollmentNo",
      ]);
      const enrollmentNo = toCleanString(enrollmentRaw);

      if (!enrollmentNo) {
        skipped += 1;
        console.warn(`Row ${index + 2}: Missing Enrollment_No, skipping`);
        continue;
      }

      const nameRaw = getCellValue(row, [
        "Student_Name",
        "student_name",
        "Name",
      ]);
      const fullName = toCleanString(nameRaw) || "Imported Student";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "Imported";
      const lastName = nameParts.slice(1).join(" ") || "Student";

      const branchName = getCellValue(row, ["Branch", "branch"]);
      const yearValue = getCellValue(row, ["Year", "year"]);
      const yearNumber = parseYear(yearValue);
      const semester = yearToSemester(yearNumber);

      const branch = await getOrCreateBranch(branchName);

      const existing = await StudentDetail.findOne({ enrollmentNo });

      const baseData = {
        firstName,
        middleName: "",
        lastName,
        email: `${enrollmentNo}@example.com`,
        phone: "9999999999",
        semester,
        branchId: branch ? branch._id : undefined,
        gender: "other",
        dob: new Date("2004-01-01"),
        address: "Imported from attendance sheet",
        city: "City",
        state: "State",
        pincode: "000000",
        country: "Country",
        profile: "",
        status: "active",
        bloodGroup: "O+",
        emergencyContact: {
          name: "Guardian",
          relationship: "Parent",
          phone: "9999999999",
        },
      };

      if (existing) {
        await StudentDetail.findByIdAndUpdate(
          existing._id,
          {
            ...baseData,
          },
          { new: true }
        );
        updated += 1;
      } else {
        await StudentDetail.create({
          ...baseData,
          enrollmentNo,
          password: "student123",
        });
        created += 1;
      }
    }

    console.log("Import finished.");
    console.log("Created students:", created);
    console.log("Updated students:", updated);
    console.log("Skipped rows:", skipped);
  } catch (err) {
    console.error("Import error:", err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

main();

