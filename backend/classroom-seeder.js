const Classroom = require("./models/classroom.model");
const connectToMongo = require("./Database/db");
const mongoose = require("mongoose");

const seedClassrooms = async () => {
  try {
    await connectToMongo();

    const shouldReset = process.argv.includes("--reset");

    if (shouldReset) {
      // Clear existing classroom data only if --reset flag is provided
      await Classroom.deleteMany({});
      console.log("Existing classroom data cleared (--reset flag provided)");
    } else {
      // Check if classrooms already exist
      const existingCount = await Classroom.countDocuments({
        roomNumber: { $gte: "401", $lte: "412" },
      });
      if (existingCount >= 12) {
        console.log("Classrooms 401-412 already exist. Use --reset flag to clear and reseed.");
        await mongoose.connection.close();
        process.exit(0);
      }
    }

    // Create 12 classrooms from 401 to 412
    const classrooms = [];
    for (let i = 401; i <= 412; i++) {
      classrooms.push({
        roomNumber: i.toString(),
        capacity: 50,
        floor: 4,
        status: "available",
      });
    }

    await Classroom.insertMany(classrooms);

    console.log("\n=== Classroom Seeding ===");
    console.log(`Successfully created ${classrooms.length} classrooms:`);
    classrooms.forEach((classroom) => {
      console.log(`- Room ${classroom.roomNumber} (Capacity: ${classroom.capacity}, Floor: ${classroom.floor})`);
    });
    console.log("=======================\n");
    console.log("Classroom seeding completed successfully!");
  } catch (error) {
    console.error("Error while seeding classrooms:", error);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
};

seedClassrooms();

