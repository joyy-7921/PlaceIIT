/**
 * Seed script: create InterviewRound docs + place students in rounds 2 & 3.
 * Also fixes missing `branch` on students.
 * Idempotent — safe to re-run.
 *
 * Usage: node src/seed-rounds.js
 */
const mongoose = require("mongoose");
const Company = require("./models/Company.model");
const Student = require("./models/Student.model");
const Queue = require("./models/Queue.model");
const InterviewRound = require("./models/InterviewRound.model");
require("dotenv").config({ path: __dirname + "/../.env" });

// Map roll number prefix to branch name
const BRANCH_MAP = {
    CS: "Computer Science",
    EE: "Electrical Eng",
    ME: "Mechanical Eng",
    CE: "Civil Eng",
    CH: "Chemical Eng",
    EC: "Electronics & Comm",
    IT: "Information Technology",
    BT: "Biotechnology",
    MM: "Metallurgical Eng",
};

async function seedRounds() {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error("MONGO_URI is not defined");

        await mongoose.connect(uri);
        console.log("Connected to MongoDB Atlas");

        // ────────── 1. Fix missing departments ──────────
        const studentsNoBranch = await Student.find({
            $or: [{ branch: null }, { branch: "" }, { branch: { $exists: false } }],
        });
        let branchFixed = 0;
        for (const student of studentsNoBranch) {
            const match = student.rollNumber?.match(/\d{4}([A-Z]{2})/);
            if (match) {
                const prefix = match[1];
                const branch = BRANCH_MAP[prefix] || "General";
                await Student.findByIdAndUpdate(student._id, { branch });
                console.log(`  Fixed branch for ${student.rollNumber} → ${branch}`);
                branchFixed++;
            }
        }
        console.log(`Fixed ${branchFixed} students missing branch.\n`);

        // ────────── 2. Setup companies ──────────
        const google = await Company.findOne({ name: "Google" });
        const microsoft = await Company.findOne({ name: "Microsoft" });

        if (!google || !microsoft) {
            console.log("Google or Microsoft companies not found. Run seed-more.js first.");
            process.exit(0);
        }

        // Update totalRounds
        await Company.findByIdAndUpdate(google._id, { totalRounds: 3 });
        await Company.findByIdAndUpdate(microsoft._id, { totalRounds: 2 });
        console.log("Updated totalRounds: Google=3, Microsoft=2\n");

        // ────────── 3. Create InterviewRound docs ──────────
        const roundConfigs = [
            { companyId: google._id, roundNumber: 1, roundName: "Aptitude Test" },
            { companyId: google._id, roundNumber: 2, roundName: "Technical Round" },
            { companyId: google._id, roundNumber: 3, roundName: "HR Round" },
            { companyId: microsoft._id, roundNumber: 1, roundName: "Online Test" },
            { companyId: microsoft._id, roundNumber: 2, roundName: "Interview" },
        ];

        const roundMap = {}; // { "companyId:roundNumber": roundDoc }
        for (const rc of roundConfigs) {
            let round = await InterviewRound.findOne({
                companyId: rc.companyId,
                roundNumber: rc.roundNumber,
            });
            if (!round) {
                round = await InterviewRound.create(rc);
                console.log(`  Created round: ${rc.roundName} (R${rc.roundNumber}) for ${rc.companyId.equals(google._id) ? "Google" : "Microsoft"}`);
            } else {
                console.log(`  Round exists: ${rc.roundName} (R${rc.roundNumber})`);
            }
            roundMap[`${rc.companyId}:${rc.roundNumber}`] = round;
        }
        console.log("");

        // ────────── 4. Place students in rounds 2 & 3 ──────────
        const allStudents = await Student.find().limit(20);
        if (allStudents.length < 8) {
            console.log("Not enough students to populate rounds. Run seed-more.js first.");
            process.exit(0);
        }

        // Google Round 2: students 3-7
        const googleR2 = roundMap[`${google._id}:2`];
        for (let i = 3; i < 8 && i < allStudents.length; i++) {
            const s = allStudents[i];
            await Queue.findOneAndUpdate(
                { studentId: s._id, companyId: google._id },
                {
                    studentId: s._id,
                    companyId: google._id,
                    roundId: googleR2._id,
                    status: i < 5 ? "in_queue" : "completed",
                },
                { upsert: true }
            );
            // Shortlist
            await Company.findByIdAndUpdate(google._id, { $addToSet: { shortlistedStudents: s._id } });
            await Student.findByIdAndUpdate(s._id, { $addToSet: { shortlistedCompanies: google._id } });
        }
        console.log("  Google Round 2: students 4-8 placed (2 in-queue, 3 completed)");

        // Google Round 3: students 8-10
        const googleR3 = roundMap[`${google._id}:3`];
        for (let i = 8; i < 11 && i < allStudents.length; i++) {
            const s = allStudents[i];
            await Queue.findOneAndUpdate(
                { studentId: s._id, companyId: google._id },
                {
                    studentId: s._id,
                    companyId: google._id,
                    roundId: googleR3._id,
                    status: "in_queue",
                },
                { upsert: true }
            );
            await Company.findByIdAndUpdate(google._id, { $addToSet: { shortlistedStudents: s._id } });
            await Student.findByIdAndUpdate(s._id, { $addToSet: { shortlistedCompanies: google._id } });
        }
        console.log("  Google Round 3: students 9-11 placed (in-queue)");

        // Microsoft Round 2: students 11-14
        const msR2 = roundMap[`${microsoft._id}:2`];
        for (let i = 11; i < 15 && i < allStudents.length; i++) {
            const s = allStudents[i];
            await Queue.findOneAndUpdate(
                { studentId: s._id, companyId: microsoft._id },
                {
                    studentId: s._id,
                    companyId: microsoft._id,
                    roundId: msR2._id,
                    status: i < 13 ? "in_queue" : "completed",
                },
                { upsert: true }
            );
            await Company.findByIdAndUpdate(microsoft._id, { $addToSet: { shortlistedStudents: s._id } });
            await Student.findByIdAndUpdate(s._id, { $addToSet: { shortlistedCompanies: microsoft._id } });
        }
        console.log("  Microsoft Round 2: students 12-15 placed (2 in-queue, 2 completed)");

        console.log("\n✅ Seed rounds complete!");
    } catch (error) {
        console.error("Error seeding rounds:", error.message);
    } finally {
        process.exit(0);
    }
}

seedRounds();
