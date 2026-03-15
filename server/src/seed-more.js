const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User.model");
const Student = require("./models/Student.model");
require("dotenv").config({ path: __dirname + "/../.env" });

const mockStudents = [
    { name: "Rahul Kumar", rollNo: "2021CS101", branch: "Computer Science", cgpa: 9.2, phone: "9876543210" },
    { name: "Priya Sharma", rollNo: "2021EE102", branch: "Electrical Eng", cgpa: 8.8, phone: "9876543211" },
    { name: "Amit Patel", rollNo: "2021ME103", branch: "Mechanical Eng", cgpa: 7.9, phone: "9876543212" },
    { name: "Sneha Reddy", rollNo: "2021CE104", branch: "Civil Eng", cgpa: 9.5, phone: "9876543213" },
    { name: "Vikram Singh", rollNo: "2021CH105", branch: "Chemical Eng", cgpa: 8.1, phone: "9876543214" },
    { name: "Ananya Desai", rollNo: "2021CS106", branch: "Computer Science", cgpa: 9.8, phone: "9876543215" },
    { name: "Rohan Gupta", rollNo: "2021EE107", branch: "Electrical Eng", cgpa: 7.5, phone: "9876543216" },
    { name: "Neha Verma", rollNo: "2021ME108", branch: "Mechanical Eng", cgpa: 8.4, phone: "9876543217" },
    { name: "Aditya Nair", rollNo: "2021CE109", branch: "Civil Eng", cgpa: 9.1, phone: "9876543218" },
    { name: "Kavya Menon", rollNo: "2021CH110", branch: "Chemical Eng", cgpa: 8.9, phone: "9876543219" },
    { name: "Siddharth Rao", rollNo: "2021CS111", branch: "Computer Science", cgpa: 9.4, phone: "9876543220" },
    { name: "Meera Iyer", rollNo: "2021EE112", branch: "Electrical Eng", cgpa: 8.2, phone: "9876543221" },
    { name: "Arjun Chawla", rollNo: "2021ME113", branch: "Mechanical Eng", cgpa: 7.8, phone: "9876543222" },
    { name: "Tara Joshi", rollNo: "2021CE114", branch: "Civil Eng", cgpa: 9.0, phone: "9876543223" },
    { name: "Dev Malik", rollNo: "2021CH115", branch: "Chemical Eng", cgpa: 8.6, phone: "9876543224" },
    { name: "Ismat Ali", rollNo: "2021CS116", branch: "Computer Science", cgpa: 9.7, phone: "9876543225" },
    { name: "Omar Khan", rollNo: "2021EE117", branch: "Electrical Eng", cgpa: 8.0, phone: "9876543226" },
    { name: "Zoya Ahmed", rollNo: "2021ME118", branch: "Mechanical Eng", cgpa: 8.3, phone: "9876543227" },
    { name: "Kabir Das", rollNo: "2021CE119", branch: "Civil Eng", cgpa: 9.3, phone: "9876543228" },
    { name: "Sanya Kapoor", rollNo: "2021CH120", branch: "Chemical Eng", cgpa: 8.7, phone: "9876543229" }
];

const Company = require("./models/Company.model");
const Queue = require("./models/Queue.model");

async function seedStudents() {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error("MONGO_URI is not defined");

        await mongoose.connect(uri);
        console.log("Connected to MongoDB Atlas");

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash("student123", salt);

        // Create 2 mock companies to test queue functionality
        let google = await Company.findOne({ name: "Google", day: 1 });
        if (!google) {
            google = await Company.create({
                name: "Google",
                day: 1,
                slot: "morning",
                venue: "Seminar Hall A",
                isActive: true,
                isWalkInEnabled: true
            });
            console.log("Created mock company: Google");
        }

        let microsoft = await Company.findOne({ name: "Microsoft", day: 1 });
        if (!microsoft) {
            microsoft = await Company.create({
                name: "Microsoft",
                day: 1,
                slot: "afternoon",
                venue: "Lab 3",
                isActive: true,
                isWalkInEnabled: true
            });
            console.log("Created mock company: Microsoft");
        }

        let count = 0;
        const addedStudents = [];

        for (const studentData of mockStudents) {
            const email = `${studentData.rollNo.toLowerCase()}@institute.edu`;

            // Check if user exists
            let user = await User.findOne({ instituteId: studentData.rollNo });
            if (user) {
                console.log(`Student ${studentData.rollNo} already exists, skipping user creation.`);
            } else {
                user = await User.create({
                    instituteId: studentData.rollNo,
                    password: passwordHash,
                    role: "student",
                    email: email,
                });

                const student = await Student.create({
                    userId: user._id,
                    rollNumber: studentData.rollNo,
                    name: studentData.name,
                    branch: studentData.branch,
                    cgpa: studentData.cgpa,
                    contact: studentData.phone,
                    email: email,
                    emergencyContact: {
                        name: "Parent/Guardian",
                        phone: `99${studentData.phone.substring(2)}`,
                        relation: "Parent"
                    }
                });
                console.log(`Created student: ${studentData.name} (${studentData.rollNo})`);
                addedStudents.push(student);
                count++;
            }
        }

        // Add some students to the queue to test the status display
        const allStudents = await Student.find({ rollNumber: { $in: mockStudents.map(s => s.rollNo) } });

        if (allStudents.length >= 4) {
            // Put first student in interview with Google
            await Queue.findOneAndUpdate(
                { studentId: allStudents[0]._id, companyId: google._id },
                { status: "in_interview" },
                { upsert: true }
            );

            // Put second student in queue for Google
            await Queue.findOneAndUpdate(
                { studentId: allStudents[1]._id, companyId: google._id },
                { status: "in_queue", position: 1 },
                { upsert: true }
            );

            // Put third student in queue for Microsoft
            await Queue.findOneAndUpdate(
                { studentId: allStudents[2]._id, companyId: microsoft._id },
                { status: "in_queue", position: 1 },
                { upsert: true }
            );

            console.log("Seeded mock Queue entries for testing statuses.");
        }

        console.log(`\n✅ Finished adding ${count} new mock students to the database.`);

    } catch (error) {
        console.error("Error seeding students:", error.message);
    } finally {
        process.exit(0);
    }
}

seedStudents();
