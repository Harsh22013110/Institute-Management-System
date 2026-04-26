require("dotenv").config();
const mongoose = require("mongoose");
const Branch = require("./models/branch.model");
const StudentDetail = require("./models/details/student-details.model");
const connectToMongo = require("./Database/db");

const BRANCH_NAME = "Electronics and Telecommunication";
const BRANCH_ID = "ENTC";
const DEFAULT_PASSWORD = "student123";

const FIRST_NAMES = [
  "Aarav",
  "Vivaan",
  "Aditya",
  "Vihaan",
  "Arjun",
  "Sai",
  "Krishna",
  "Ishaan",
  "Rohan",
  "Kabir",
  "Ananya",
  "Aadhya",
  "Diya",
  "Ira",
  "Myra",
  "Saanvi",
  "Riya",
  "Meera",
  "Nisha",
  "Pooja",
];

const LAST_NAMES = [
  "Sharma",
  "Verma",
  "Patel",
  "Gupta",
  "Singh",
  "Khan",
  "Jain",
  "Reddy",
  "Iyer",
  "Nair",
  "Kulkarni",
  "Das",
  "Mishra",
  "Yadav",
  "Choudhary",
  "Joshi",
  "Mehta",
  "Rao",
  "Sinha",
  "Roy",
];

function pick(arr, i) {
  return arr[i % arr.length];
}

async function ensureBranch() {
  let branch = await Branch.findOne({ name: BRANCH_NAME });
  if (branch) return branch;

  // If a branch with same ID exists, use a safe unique ID.
  let branchId = BRANCH_ID;
  const existingById = await Branch.findOne({ branchId });
  if (existingById) {
    branchId = `${BRANCH_ID}-${Date.now()}`;
  }

  branch = await Branch.create({ branchId, name: BRANCH_NAME });
  return branch;
}

async function seed() {
  await connectToMongo();
  const branch = await ensureBranch();

  const shouldReset = process.argv.includes("--reset");
  if (shouldReset) {
    await StudentDetail.deleteMany({ branchId: branch._id, semester: 8 });
    console.log("Existing ENTC semester 8 students cleared (--reset).");
  }

  // Use a high numeric range to avoid collisions with existing data.
  const baseEnrollment = 88000001;

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < 60; i++) {
    const enrollmentNo = baseEnrollment + i;

    const existing = await StudentDetail.findOne({ enrollmentNo });
    if (existing) {
      skipped += 1;
      continue;
    }

    const firstName = pick(FIRST_NAMES, i);
    const lastName = pick(LAST_NAMES, i);

    // Keep email consistent and unique
    const email = `${enrollmentNo}@gmail.com`;

    // Ensure a 10-digit phone number string
    const phone = String(9000000000 + i).padStart(10, "9");

    await StudentDetail.create({
      enrollmentNo,
      firstName,
      middleName: "NA",
      lastName,
      email,
      phone,
      semester: 8,
      branchId: branch._id,
      gender: i % 3 === 0 ? "male" : i % 3 === 1 ? "female" : "other",
      dob: new Date("2003-01-01"),
      address: "ENTC Seed Address",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      country: "India",
      profile: "",
      status: "active",
      bloodGroup: "O+",
      emergencyContact: {
        name: "Guardian",
        relationship: "Parent",
        phone: "9999999999",
      },
      password: DEFAULT_PASSWORD,
    });

    created += 1;
  }

  console.log("\n=== ENTC Semester 8 Students Seeded ===");
  console.log("Branch:", branch.name, `(${branch.branchId})`);
  console.log("Semester:", 8);
  console.log("Created:", created);
  console.log("Skipped (already existed):", skipped);
  console.log("Default Password:", DEFAULT_PASSWORD);
  console.log(
    "Login email format example:",
    `${baseEnrollment}@gmail.com`
  );
}

(async () => {
  try {
    await seed();
  } catch (err) {
    console.error("Seeder error:", err);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
})();

