require("dotenv").config();
const mongoose = require("mongoose");
const connectToMongo = require("./Database/db");

// Models
const Branch = require("./models/branch.model");
const AdminDetail = require("./models/details/admin-details.model");
const FacultyDetail = require("./models/details/faculty-details.model");
const StudentDetail = require("./models/details/student-details.model");
const Subject = require("./models/subject.model");
const Exam = require("./models/exam.model");
const Marks = require("./models/marks.model");
const Material = require("./models/material.model");
const Notice = require("./models/notice.model");
const Timetable = require("./models/timetable.model");

const DUMMY_TAG = "[DUMMY]";
const DUMMY_EMAIL_DOMAIN = "@dummy.local";

function isUndoMode() {
  return process.argv.includes("--undo");
}

async function seed() {
  await connectToMongo();

  // 1) Branch
  const branch = await Branch.create({
    branchId: `DUMMY-CSE-001`,
    name: `${DUMMY_TAG} Computer Science`
  });

  // 2) Admin
  const admin = await AdminDetail.create({
    employeeId: 999001,
    firstName: `${DUMMY_TAG} Ada`,
    lastName: "Lovelace",
    email: `admin${DUMMY_EMAIL_DOMAIN}`,
    phone: "9990000001",
    profile: "Faculty_Profile_123456.jpg",
    address: "SEED_DUMMY_DATA",
    city: "Seed City",
    state: "Seed State",
    pincode: "000001",
    country: "Seedland",
    gender: "female",
    dob: new Date("1990-01-01"),
    designation: "System Administrator",
    joiningDate: new Date(),
    salary: 123456,
    status: "active",
    isSuperAdmin: true,
    emergencyContact: {
      name: "Seed Contact",
      relationship: "Friend",
      phone: "9990000002"
    },
    bloodGroup: "O+",
    password: "admin123"
  });

  // 3) Faculty
  const faculty = await FacultyDetail.create({
    employeeId: 999101,
    firstName: `${DUMMY_TAG} Alan`,
    lastName: "Turing",
    email: `faculty${DUMMY_EMAIL_DOMAIN}`,
    phone: "9990000010",
    profile: "Faculty_Profile_123456.jpg",
    address: "SEED_DUMMY_DATA",
    city: "Seed City",
    state: "Seed State",
    pincode: "000002",
    country: "Seedland",
    gender: "male",
    dob: new Date("1985-06-23"),
    designation: "Assistant Professor",
    joiningDate: new Date(),
    salary: 90000,
    status: "active",
    emergencyContact: {
      name: "Seed Contact",
      relationship: "Sibling",
      phone: "9990000011"
    },
    bloodGroup: "A+",
    branchId: branch._id,
    password: "faculty123"
  });

  // 4) Student
  const student = await StudentDetail.create({
    enrollmentNo: 22000001,
    firstName: `${DUMMY_TAG} Grace`,
    middleName: "B",
    lastName: "Hopper",
    email: `student${DUMMY_EMAIL_DOMAIN}`,
    phone: "9990000100",
    semester: 3,
    branchId: branch._id,
    gender: "female",
    dob: new Date("2004-12-09"),
    address: "SEED_DUMMY_DATA",
    city: "Seed City",
    state: "Seed State",
    pincode: "000003",
    country: "Seedland",
    profile: "Faculty_Profile_123456.jpg",
    status: "active",
    bloodGroup: "B+",
    emergencyContact: {
      name: "Seed Guardian",
      relationship: "Parent",
      phone: "9990000101"
    },
    password: "student123"
  });

  // 5) Subjects
  const subject1 = await Subject.create({
    name: `${DUMMY_TAG} Data Structures`,
    code: "DUM101",
    branch: branch._id,
    semester: 3,
    credits: 4
  });
  const subject2 = await Subject.create({
    name: `${DUMMY_TAG} Discrete Mathematics`,
    code: "DUM102",
    branch: branch._id,
    semester: 3,
    credits: 3
  });

  // 6) Exam
  const exam = await Exam.create({
    name: `${DUMMY_TAG} Mid Semester`,
    date: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    semester: 3,
    examType: "mid",
    timetableLink: "https://example.com/dummy-exam-timetable.pdf",
    totalMarks: 100
  });

  // 7) Timetable
  const timetable = await Timetable.create({
    link: "https://example.com/dummy-timetable.pdf",
    branch: branch._id,
    semester: 3
  });

  // 8) Materials
  const material = await Material.create({
    title: `${DUMMY_TAG} DS Notes 1`,
    subject: subject1._id,
    faculty: faculty._id,
    file: "1761512516769.pdf",
    semester: 3,
    branch: branch._id,
    type: "notes"
  });

  // 9) Notice
  const notice = await Notice.create({
    title: `${DUMMY_TAG} Welcome Notice`,
    description: "This is dummy seeded notice for testing.",
    type: "both",
    link: "https://example.com/dummy-notice"
  });

  // 10) Marks
  await Marks.create({
    studentId: student._id,
    subjectId: subject1._id,
    marksObtained: 78,
    semester: 3,
    examId: exam._id
  });

  console.log("\n=== Dummy Data Seeded ===");
  console.log("Branch:", branch.name);
  console.log("Admin:", admin.email);
  console.log("Faculty:", faculty.email);
  console.log("Student:", student.email);
  console.log("Subjects:", subject1.code, subject2.code);
  console.log("Exam:", exam.name);
  console.log("Timetable:", timetable.link);
  console.log("Material:", material.title);
  console.log("Notice:", notice.title);
}

async function undo() {
  await connectToMongo();

  const branch = await Branch.findOne({ branchId: "DUMMY-CSE-001" });

  await Promise.all([
    AdminDetail.deleteMany({ email: { $regex: `${DUMMY_EMAIL_DOMAIN}$` } }),
    FacultyDetail.deleteMany({ email: { $regex: `${DUMMY_EMAIL_DOMAIN}$` } }),
    StudentDetail.deleteMany({ email: { $regex: `${DUMMY_EMAIL_DOMAIN}$` } }),
    Subject.deleteMany({ code: { $in: ["DUM101", "DUM102"] } }),
    Exam.deleteMany({ name: { $regex: `^\\${DUMMY_TAG}` } }),
    Notice.deleteMany({ title: { $regex: `^\\${DUMMY_TAG}` } }),
    Material.deleteMany({ title: { $regex: `^\\${DUMMY_TAG}` } }),
    Timetable.deleteMany({ link: { $regex: "dummy-timetable" } }),
    Marks.deleteMany({})
  ]);

  if (branch) {
    await Branch.deleteOne({ _id: branch._id });
  } else {
    await Branch.deleteMany({ name: { $regex: `^\\${DUMMY_TAG}` } });
  }

  console.log("Dummy data removed.");
}

(async () => {
  try {
    if (isUndoMode()) {
      await undo();
    } else {
      await seed();
    }
  } catch (err) {
    console.error("Seeder error:", err);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
})();



