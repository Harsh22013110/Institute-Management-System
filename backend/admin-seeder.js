const adminDetails = require("./models/details/admin-details.model");
const connectToMongo = require("./database/db");
const mongoose = require("mongoose");

const seedData = async () => {
  try {
    await connectToMongo();

    const shouldReset = process.argv.includes("--reset");

    if (shouldReset) {
      // Clear existing admin data only if --reset flag is provided
      await adminDetails.deleteMany({});
      console.log("Existing admin data cleared (--reset flag provided)");
    } else {
      // Check if admin already exists
      const existingAdmin = await adminDetails.findOne({
        email: "admin@gmail.com",
      });
      if (existingAdmin) {
        console.log("Admin already exists. Use --reset flag to clear and reseed.");
        await mongoose.connection.close();
        process.exit(0);
      }
    }

    const password = "admin123";
    const employeeId = 123456;

    const adminDetail = {
      employeeId: employeeId,
      firstName: "Sundar",
      middleName: "R",
      lastName: "Pichai",
      email: "admin@gmail.com",
      phone: "1234567890",
      profile: "Faculty_Profile_123456.jpg",
      address: "123 College Street",
      city: "College City",
      state: "State",
      pincode: "123456",
      country: "India",
      gender: "male",
      dob: new Date("1990-01-01"),
      designation: "System Administrator",
      joiningDate: new Date(),
      salary: 50000,
      status: "active",
      isSuperAdmin: true,
      emergencyContact: {
        name: "Emergency Contact",
        relationship: "Spouse",
        phone: "9876543210",
      },
      bloodGroup: "O+",
      password: password,
    };

    await adminDetails.create(adminDetail);

    console.log("\n=== Admin Credentials ===");
    console.log("Employee ID:", employeeId);
    console.log("Password:", password);
    console.log("Email:", adminDetail.email);
    console.log("=======================\n");
    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Error while seeding:", error);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
};

seedData();
