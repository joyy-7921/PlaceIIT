const mongoose = require("mongoose");
const User = require("./models/User.model");
const Student = require("./models/Student.model");
const Coordinator = require("./models/Coordinator.model");
const Apc = require("./models/Apc.model");
const Company = require("./models/Company.model");
const ExcelUpload = require("./models/ExcelUpload.model");
const InterviewRound = require("./models/InterviewRound.model");
const Notification = require("./models/Notification.model");
const Panel = require("./models/Panel.model");
const Query = require("./models/Query.model");
const Queue = require("./models/Queue.model");
const { MONGO_URI } = require("./config/env");

const SEED_USERS = ["admin001", "2021CS101", "coco001"];

async function cleanup() {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB for cleanup");

    // 1. Identify seed users
    const seedUserDocs = await User.find({ instituteId: { $in: SEED_USERS } });
    const seedUserIds = seedUserDocs.map(u => u._id);

    console.log(`Found ${seedUserIds.length} seed users to keep.`);

    // 2. Delete all non-seed Users
    const userDeleteResult = await User.deleteMany({ _id: { $nin: seedUserIds } });
    console.log(`Deleted ${userDeleteResult.deletedCount} non-seed Users.`);

    // 3. Delete non-seed Students, Coordinators, APCs
    const studentDeleteResult = await Student.deleteMany({ userId: { $nin: seedUserIds } });
    console.log(`Deleted ${studentDeleteResult.deletedCount} non-seed Students.`);

    const cocoDeleteResult = await Coordinator.deleteMany({ userId: { $nin: seedUserIds } });
    console.log(`Deleted ${cocoDeleteResult.deletedCount} non-seed Coordinators.`);

    const apcDeleteResult = await Apc.deleteMany({ userId: { $nin: seedUserIds } });
    console.log(`Deleted ${apcDeleteResult.deletedCount} non-seed APCs.`);

    // 4. Reset associations for the seed users
    await Student.updateMany({ userId: { $in: seedUserIds } }, {
        $set: { shortlistedCompanies: [] }
    });
    await Coordinator.updateMany({ userId: { $in: seedUserIds } }, {
        $set: { assignedCompanies: [] }
    });
    console.log(`Reset references (companies, shortlists) for seed users.`);

    // 5. Delete all other data completely
    const collectionsToClear = [
        { name: "Company", model: Company },
        { name: "ExcelUpload", model: ExcelUpload },
        { name: "InterviewRound", model: InterviewRound },
        { name: "Notification", model: Notification },
        { name: "Panel", model: Panel },
        { name: "Query", model: Query },
        { name: "Queue", model: Queue }
    ];

    for (const { name, model } of collectionsToClear) {
        const result = await model.deleteMany({});
        console.log(`Cleared collection ${name}: deleted ${result.deletedCount} documents.`);
    }

    console.log("\n✅ Cleanup complete! System is reset to a fresh state with only base seed users.");
    await mongoose.disconnect();
}

cleanup().catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
});
