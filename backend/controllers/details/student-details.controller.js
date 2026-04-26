const studentDetails = require("../../models/details/student-details.model");
const resetToken = require("../../models/reset-password.model");
const bcrypt = require("bcryptjs");
const ApiResponse = require("../../utils/ApiResponse");
const jwt = require("jsonwebtoken");
const sendResetMail = require("../../utils/SendMail");
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const Branch = require("../../models/branch.model");

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
    if (Object.prototype.hasOwnProperty.call(normalized, norm)) {
      return normalized[norm];
    }
  }
  return undefined;
}

function toCleanString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function parseEnrollmentNumber(value) {
  const str = toCleanString(value);
  if (!str) return null;
  if (/^\d+$/.test(str)) return Number(str);
  const match = str.match(/\d+/);
  if (!match) return null;
  return Number(match[0]);
}

function parseYear(value) {
  const str = toCleanString(value);
  if (!str) return 0;
  const match = str.match(/\d+/);
  if (!match) return 0;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : 0;
}

function yearToSemesterStart(yearNumber) {
  if (!yearNumber || !Number.isFinite(yearNumber)) return 1;
  const sem = (yearNumber - 1) * 2 + 1;
  return sem > 0 ? sem : 1;
}

async function getOrCreateBranchByName(branchName) {
  const name = toCleanString(branchName);
  if (!name) return null;

  let branch = await Branch.findOne({ name });
  if (branch) return branch;

  const code =
    name
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("") || "GEN";

  // Ensure branchId uniqueness
  let branchId = code;
  const existingById = await Branch.findOne({ branchId });
  if (existingById) {
    branchId = `${code}-${Date.now()}`;
  }

  branch = await Branch.create({ branchId, name });
  return branch;
}

const loginStudentController = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await studentDetails.findOne({ email });

    if (!user) {
      return ApiResponse.notFound("User not found").send(res);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return ApiResponse.unauthorized("Invalid password").send(res);
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 604800000, // 7 days
    });

    return ApiResponse.success({ token }, "Login successful").send(res);
  } catch (error) {
    console.error("Login Error: ", error);
    return ApiResponse.internalServerError().send(res);
  }
};

const getAllDetailsController = async (req, res) => {
  try {
    const users = await studentDetails
      .find()
      .select("-__v -password")
      .populate("branchId");

    if (!users || users.length === 0) {
      return ApiResponse.notFound("No Student Found").send(res);
    }

    return ApiResponse.success(users, "Student Details Found!").send(res);
  } catch (error) {
    console.error("Get Details Error: ", error);
    return ApiResponse.internalServerError().send(res);
  }
};

const registerStudentController = async (req, res) => {
  try {
    const profile = req.file.filename;

    const enrollmentNo = Math.floor(100000 + Math.random() * 900000);
    const email = `${enrollmentNo}@gmail.com`;

    const user = await studentDetails.create({
      ...req.body,
      profile,
      password: "student123",
      email,
      enrollmentNo,
    });

    const sanitizedUser = await studentDetails
      .findById(user._id)
      .select("-__v -password");

    return ApiResponse.created(sanitizedUser, "Student Details Added!").send(
      res
    );
  } catch (error) {
    console.error("Add Details Error: ", error);
    return ApiResponse.internalServerError().send(res);
  }
};

const getMyDetailsController = async (req, res) => {
  try {
    const user = await studentDetails
      .findById(req.userId)
      .select("-password -__v")
      .populate("branchId");

    if (!user) {
      return ApiResponse.notFound("User not found").send(res);
    }

    return ApiResponse.success(user, "My Details Found!").send(res);
  } catch (error) {
    console.error("Get My Details Error: ", error);
    return ApiResponse.internalServerError().send(res);
  }
};

const updateDetailsController = async (req, res) => {
  try {
    if (!req.params.id) {
      return ApiResponse.badRequest("Student ID is required").send(res);
    }

    const updateData = { ...req.body };
    const { email, phone, password, enrollmentNo } = updateData;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return ApiResponse.badRequest("Invalid email format").send(res);
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      return ApiResponse.badRequest("Phone number must be 10 digits").send(res);
    }

    if (password && password.length < 8) {
      return ApiResponse.badRequest(
        "Password must be at least 8 characters long"
      ).send(res);
    }

    if (phone) {
      const existingStudent = await studentDetails.findOne({
        _id: { $ne: req.params.id },
        phone: phone,
      });

      if (existingStudent) {
        return ApiResponse.conflict("Phone number already in use").send(res);
      }
    }

    if (email) {
      const existingStudent = await studentDetails.findOne({
        _id: { $ne: req.params.id },
        email: email,
      });

      if (existingStudent) {
        return ApiResponse.conflict("Email already in use").send(res);
      }
    }

    if (enrollmentNo) {
      const existingStudent = await studentDetails.findOne({
        _id: { $ne: req.params.id },
        enrollmentNo: enrollmentNo,
      });

      if (existingStudent) {
        return ApiResponse.conflict("Enrollment number already in use").send(
          res
        );
      }
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    // Get the current student to check for old profile photo
    const currentStudent = await studentDetails.findById(req.params.id);
    
    if (req.file) {
      // Delete old profile photo if it exists
      if (currentStudent && currentStudent.profile) {
        const oldFilePath = path.join(__dirname, "../../media", currentStudent.profile);
        try {
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        } catch (error) {
          console.error("Error deleting old profile photo:", error);
          // Continue with update even if old file deletion fails
        }
      }
      updateData.profile = req.file.filename;
    }

    if (updateData.dob) {
      updateData.dob = new Date(updateData.dob);
    }
    if (updateData.joiningDate) {
      updateData.joiningDate = new Date(updateData.joiningDate);
    }

    const updatedUser = await studentDetails
      .findByIdAndUpdate(req.params.id, updateData, { new: true })
      .select("-__v -password");

    if (!updatedUser) {
      return ApiResponse.notFound("Student not found").send(res);
    }

    return ApiResponse.success(updatedUser, "Updated Successfully!").send(res);
  } catch (error) {
    console.error("Update Details Error: ", error);
    return ApiResponse.internalServerError().send(res);
  }
};

const deleteDetailsController = async (req, res) => {
  try {
    if (!req.params.id) {
      return ApiResponse.badRequest("Student ID is required").send(res);
    }

    const user = await studentDetails.findById(req.params.id);

    if (!user) {
      return ApiResponse.notFound("No Student Found").send(res);
    }

    await studentDetails.findByIdAndDelete(req.params.id);

    return ApiResponse.success(null, "Deleted Successfully!").send(res);
  } catch (error) {
    console.error("Delete Details Error: ", error);
    return ApiResponse.internalServerError().send(res);
  }
};

const sendForgetPasswordEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return ApiResponse.badRequest("Email is required").send(res);
    }

    const user = await studentDetails.findOne({ email });

    if (!user) {
      return ApiResponse.notFound("No Student Found").send(res);
    }
    const resetTkn = jwt.sign(
      {
        _id: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "10m",
      }
    );

    await resetToken.deleteMany({
      type: "StudentDetails",
      userId: user._id,
    });

    const resetId = await resetToken.create({
      resetToken: resetTkn,
      type: "StudentDetails",
      userId: user._id,
    });

    await sendResetMail(user.email, resetId._id, "student");

    return ApiResponse.success(null, "Reset Mail Send Successful").send(res);
  } catch (error) {
    console.error("Send Reset Mail Error: ", error);
    return ApiResponse.internalServerError().send(res);
  }
};

const updatePasswordHandler = async (req, res) => {
  try {
    const { resetId } = req.params;
    const { password } = req.body;
    if (!resetId || !password) {
      return ApiResponse.badRequest("Password and ResetId is Required").send(
        res
      );
    }

    const resetTkn = await resetToken.findById(resetId);

    if (!resetTkn) {
      return ApiResponse.notFound("No Reset Request Found").send(res);
    }

    const verifyToken = await jwt.verify(
      resetTkn.resetToken,
      process.env.JWT_SECRET
    );

    if (!verifyToken) {
      return ApiResponse.notFound("Token Expired").send(res);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await studentDetails.findByIdAndUpdate(verifyToken._id, {
      password: hashedPassword,
    });

    await resetToken.deleteMany({
      type: "StudentDetails",
      userId: verifyToken._id,
    });

    return ApiResponse.success(null, "Password Updated!").send(res);
  } catch (error) {
    console.error("Update Password Error: ", error);
    return ApiResponse.internalServerError().send(res);
  }
};

const searchStudentsController = async (req, res) => {
  try {
    const { enrollmentNo, name, semester, branch } = req.body;
    let query = {};

    if (!enrollmentNo && !name && !semester && !branch) {
      return ApiResponse.badRequest("Select at least one filter").send(res);
    }

    if (enrollmentNo) {
      query.enrollmentNo = enrollmentNo;
    }

    if (name) {
      query.$or = [
        { firstName: { $regex: name, $options: "i" } },
        { middleName: { $regex: name, $options: "i" } },
        { lastName: { $regex: name, $options: "i" } },
      ];
    }

    if (semester) {
      query.semester = semester;
    }

    if (branch) {
      query.branchId = branch;
    }

    const students = await studentDetails
      .find(query)
      .select("-password -__v")
      .populate("branchId")
      .sort({ enrollmentNo: 1 });

    if (!students || students.length === 0) {
      return ApiResponse.notFound("No students found").send(res);
    }

    return ApiResponse.success(students, "Students found successfully").send(
      res
    );
  } catch (error) {
    console.error("Search Students Error: ", error);
    return ApiResponse.internalServerError().send(res);
  }
};

// POST /api/student/import  (Excel/CSV bulk import)
const importStudentsController = async (req, res) => {
  if (!req.file) {
    return ApiResponse.badRequest("Excel/CSV file is required").send(res);
  }

  const filePath = req.file.path;

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    let processed = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const [index, row] of rows.entries()) {
      processed += 1;

      const enrollmentRaw = getCellValue(row, [
        "Enrollment_No",
        "EnrollmentNo",
        "enrollment_no",
        "enrollmentno",
        "Enrollment Number",
        "enrollment_number",
      ]);
      const enrollmentNo = parseEnrollmentNumber(enrollmentRaw);

      if (!enrollmentNo) {
        skipped += 1;
        errors.push(`Row ${index + 2}: Missing/invalid Enrollment_No`);
        continue;
      }

      const fullName = toCleanString(
        getCellValue(row, ["Student_Name", "student_name", "Name", "name"])
      );
      const nameParts = fullName ? fullName.split(/\s+/) : [];
      const firstName = nameParts[0] || "Imported";
      const lastName =
        nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Student";

      const branchName = toCleanString(getCellValue(row, ["Branch", "branch"]));
      const branchDoc = await getOrCreateBranchByName(branchName);

      const semesterRaw = getCellValue(row, [
        "Semester",
        "semester",
        "Sem",
        "sem",
      ]);
      const yearRaw = getCellValue(row, ["Year", "year"]);

      const semesterParsed = Number(toCleanString(semesterRaw));
      const yearParsed = parseYear(yearRaw);
      const semester = Number.isFinite(semesterParsed) && semesterParsed > 0
        ? semesterParsed
        : yearToSemesterStart(yearParsed);

      const emailFromFile = toCleanString(getCellValue(row, ["Email", "email"]));
      const email = emailFromFile || `${enrollmentNo}@gmail.com`;

      const phoneFromFile = toCleanString(getCellValue(row, ["Phone", "phone"]));
      const phone =
        /^\d{10}$/.test(phoneFromFile) ? phoneFromFile : "9999999999";

      const existing = await studentDetails.findOne({ enrollmentNo });

      const baseData = {
        enrollmentNo,
        firstName,
        middleName: "NA",
        lastName,
        email,
        phone,
        semester,
        branchId: branchDoc ? branchDoc._id : undefined,
        gender: "other",
        dob: new Date("2004-01-01"),
        address: "Imported from sheet",
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
        await studentDetails.findByIdAndUpdate(existing._id, baseData, {
          new: true,
        });
        updated += 1;
      } else {
        await studentDetails.create({
          ...baseData,
          password: "student123",
        });
        created += 1;
      }
    }

    return ApiResponse.success(
      { processed, created, updated, skipped, errors },
      "Students imported successfully"
    ).send(res);
  } catch (error) {
    console.error("Import Students Error:", error);
    return ApiResponse.internalServerError().send(res);
  } finally {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // ignore cleanup errors
    }
  }
};

const updateLoggedInPasswordController = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    if (!currentPassword || !newPassword) {
      return ApiResponse.badRequest(
        "Current password and new password are required"
      ).send(res);
    }

    if (newPassword.length < 8) {
      return ApiResponse.badRequest(
        "New password must be at least 8 characters long"
      ).send(res);
    }

    const user = await studentDetails.findById(userId);
    if (!user) {
      return ApiResponse.notFound("User not found").send(res);
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return ApiResponse.unauthorized("Current password is incorrect").send(
        res
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await studentDetails.findByIdAndUpdate(userId, {
      password: hashedPassword,
    });

    return ApiResponse.success(null, "Password updated successfully").send(res);
  } catch (error) {
    console.error("Update Password Error: ", error);
    return ApiResponse.internalServerError().send(res);
  }
};

module.exports = {
  loginStudentController,
  getAllDetailsController,
  registerStudentController,
  updateDetailsController,
  deleteDetailsController,
  getMyDetailsController,
  sendForgetPasswordEmail,
  updatePasswordHandler,
  searchStudentsController,
  updateLoggedInPasswordController,
  importStudentsController,
};
