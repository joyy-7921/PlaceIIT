/**
 * Additional Seed script — creates extra test students and cocos.
 * Run with: bun src/seed-extra.js
 * Delete with: bun src/seed-extra.js --delete
 */
const mongoose = require("mongoose");
const User = require("./models/User.model");
const Student = require("./models/Student.model");
const Coordinator = require("./models/Coordinator.model");
const { MONGO_URI } = require("./config/env");

const EXTRA_STUDENTS = [
  { instituteId: "2021CS102", email: "ananya.s@placeiit.in", password: "student123", name: "Ananya Sharma", rollNumber: "2021CS102" },
  { instituteId: "2021CS103", email: "vikram.r@placeiit.in", password: "student123", name: "Vikram Reddy", rollNumber: "2021CS103" },
  { instituteId: "2021EC101", email: "deepika.m@placeiit.in", password: "student123", name: "Deepika Menon", rollNumber: "2021EC101" },
  { instituteId: "2021ME101", email: "aditya.p@placeiit.in", password: "student123", name: "Aditya Patel", rollNumber: "2021ME101" },
  { instituteId: "2021CE101", email: "neha.g@placeiit.in", password: "student123", name: "Neha Gupta", rollNumber: "2021CE101" },
  { instituteId: "2021EE101", email: "saurabh.k@placeiit.in", password: "student123", name: "Saurabh Kumar", rollNumber: "2021EE101" },
  { instituteId: "2021CS104", email: "priya.j@placeiit.in", password: "student123", name: "Priya Joshi", rollNumber: "2021CS104" },
  { instituteId: "2021CS105", email: "arjun.n@placeiit.in", password: "student123", name: "Arjun Nair", rollNumber: "2021CS105" },
  { instituteId: "2021EC102", email: "sneha.t@placeiit.in", password: "student123", name: "Sneha Tiwari", rollNumber: "2021EC102" },
  { instituteId: "2021ME102", email: "karthik.v@placeiit.in", password: "student123", name: "Karthik Verma", rollNumber: "2021ME102" },
];

const EXTRA_COCOS = [
  { instituteId: "coco002", email: "coco2@placeiit.in", password: "coco123", name: "Amit Verma", rollNumber: "2020CS050" },
  { instituteId: "coco003", email: "coco3@placeiit.in", password: "coco123", name: "Sneha Gupta", rollNumber: "2020EC060" },
  { instituteId: "coco004", email: "coco4@placeiit.in", password: "coco123", name: "Rohit Singh", rollNumber: "2020ME040" },
  { instituteId: "coco005", email: "coco5@placeiit.in", password: "coco123", name: "Kavya Reddy", rollNumber: "2020CE030" },
  { instituteId: "coco006", email: "coco6@placeiit.in", password: "coco123", name: "Manish Kumar", rollNumber: "2020EE070" },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const isDelete = process.argv.includes("--delete");

  if (isDelete) {
    console.log("\n🗑️  Deleting extra seeded users...\n");
    const allExtras = [...EXTRA_STUDENTS, ...EXTRA_COCOS];
    for (const u of allExtras) {
      const user = await User.findOne({ instituteId: u.instituteId });
      if (user) {
        await Student.deleteOne({ userId: user._id });
        await Coordinator.deleteOne({ userId: user._id });
        await User.deleteOne({ _id: user._id });
        console.log(`  Deleted: ${u.instituteId} (${u.name})`);
      } else {
        console.log(`  Not found: ${u.instituteId} — skipping`);
      }
    }
    console.log("\n✅ Delete complete!");
    await mongoose.disconnect();
    return;
  }

  console.log("\n📝 Creating extra students...\n");
  for (const s of EXTRA_STUDENTS) {
    const existing = await User.findOne({ instituteId: s.instituteId });
    if (existing) {
      console.log(`  ${s.instituteId} already exists — skipping`);
      continue;
    }
    const user = await User.create({
      instituteId: s.instituteId,
      email: s.email,
      password: s.password,
      role: "student",
    });
    await Student.create({ userId: user._id, name: s.name, rollNumber: s.rollNumber });
    console.log(`  Created student: ${s.instituteId} / ${s.name}`);
  }

  console.log("\n📝 Creating extra CoCos...\n");
  for (const c of EXTRA_COCOS) {
    const existing = await User.findOne({ instituteId: c.instituteId });
    if (existing) {
      console.log(`  ${c.instituteId} already exists — skipping`);
      continue;
    }
    const user = await User.create({
      instituteId: c.instituteId,
      email: c.email,
      password: c.password,
      role: "coco",
    });
    await Coordinator.create({ userId: user._id, name: c.name, rollNumber: c.rollNumber });
    console.log(`  Created CoCo: ${c.instituteId} / ${c.name}`);
  }

  console.log("\n✅ Extra seed complete! New test credentials:");
  console.log("\n  Students (password: student123 for all):");
  EXTRA_STUDENTS.forEach((s) => console.log(`    ID: ${s.instituteId}  Name: ${s.name}`));
  console.log("\n  CoCos (password: coco123 for all):");
  EXTRA_COCOS.forEach((c) => console.log(`    ID: ${c.instituteId}  Name: ${c.name}`));
  console.log("\n  To delete all extra users: bun src/seed-extra.js --delete");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
