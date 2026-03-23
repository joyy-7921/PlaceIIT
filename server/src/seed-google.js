/**
 * Script to dynamically seed 'Google', assign coco001 as coordinator,
 * and create random students not hardcoded.
 * 
 * Run with: bun src/seed-google.js
 */
const mongoose = require("mongoose");
const User = require("./models/User.model");
const Student = require("./models/Student.model");
const Coordinator = require("./models/Coordinator.model");
const Company = require("./models/Company.model");
const { MONGO_URI } = require("./config/env");

const firstNames = ["Rahul", "Amit", "Priya", "Sneha", "Rohan", "Vikram", "Siddharth", "Neha", "Pooja", "Ananya"];
const lastNames = ["Sharma", "Verma", "Gupta", "Singh", "Patil", "Reddy", "Kumar", "Desai", "Mehta", "Joshi"];
const branches = ["CS", "EC", "EE", "ME", "CE"];

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function getRandomItem(arr) {
  return arr[getRandomInt(arr.length)];
}

async function seedGoogle() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB for seeding Google");

  // Find coco001 Coordinator
  const cocoUser = await User.findOne({ instituteId: "coco001" });
  if (!cocoUser) {
    console.error("Coordinator User 'coco001' not found. Please run regular seed.js first.");
    process.exit(1);
  }

  const coordinator = await Coordinator.findOne({ userId: cocoUser._id });
  if (!coordinator) {
    console.error("Coordinator profile for 'coco001' not found.");
    process.exit(1);
  }

  // Check if Google already exists
  let google = await Company.findOne({ name: "Google" });
  if (!google) {
    google = new Company({
      name: "Google",
      description: "Tech Giant",
      day: 1,
      slot: "morning",
      mode: "offline",
      assignedCocos: [coordinator._id],
      shortlistedStudents: [],
      isWalkInEnabled: false,
    });
    console.log("Created brand new Google company.");
  } else {
    // Make sure coordinator is assigned
    if (!google.assignedCocos.includes(coordinator._id)) {
      google.assignedCocos.push(coordinator._id);
    }
    google.day = 1;
    google.slot = "morning";
    console.log("Found existing Google company, ensuring coco001 is assigned and day/slot are updated.");
  }

  // Save the assignment on Coordinator side as well
  if (!coordinator.assignedCompanies.includes(google._id)) {
    coordinator.assignedCompanies.push(google._id);
    await coordinator.save();
    console.log("Added Google to coco001's assigned companies.");
  }

  // Let's generate 20 random students who are shortlisted for Google
  console.log("Dynamically generating 20 test students...");
  let studentsAddedCount = 0;

  for (let i = 0; i < 20; i++) {
    const fName = getRandomItem(firstNames);
    const lName = getRandomItem(lastNames);
    const name = `${fName} ${lName}`;
    const branch = getRandomItem(branches);
    
    // Generate a unique random institute ID: e.g. 2022CS582
    const randomDigits = String(getRandomInt(900) + 100); 
    const instituteId = `2022${branch}${randomDigits}-${Date.now().toString().slice(-4)}${i}`; 
    const rollNumber = instituteId; // same for test
    const email = `${fName.toLowerCase()}.${lName.toLowerCase()}${randomDigits}@placeiit.in`;

    try {
      // 1. Create User
      const userDoc = new User({
        instituteId,
        email,
        password: "student123", // default password
        role: "student",
      });
      await userDoc.save();

      // 2. Create Student profile
      const studentDoc = new Student({
        userId: userDoc._id,
        name,
        rollNumber,
        branch,
        batch: "2024",
      });
      await studentDoc.save();

      // 3. Shortlist for Google
      if (!google.shortlistedStudents.includes(studentDoc._id)) {
        google.shortlistedStudents.push(studentDoc._id);
      }
      studentsAddedCount++;
      console.log(`  Added student: ${name} (${instituteId})`);

    } catch (err) {
      console.error(`  Failed to generate student ${name}: ${err.message}`);
    }
  }

  await google.save();
  console.log(`\nSuccessfully added/updated Google, assigned coco001, and added ${studentsAddedCount} dynamically generated students.`);
  console.log("All generated students use password 'student123'.");

  await mongoose.disconnect();
}

seedGoogle().catch((err) => {
  console.error("Seed-Google failed:", err);
  process.exit(1);
});
