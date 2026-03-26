require("./src/config/env");
const mongoose = require("mongoose");
const { sendWelcomeEmail } = require("./src/services/email.service");
const User = require("./src/models/User.model");
const Student = require("./src/models/Student.model");
const crypto = require("crypto");

async function testAddStudent() {
    await mongoose.connect(process.env.MONGO_URI);

    const finalEmail = "agenttest@example.com";
    const name = "Agent Test";
    const rollNumber = "AGENT123";
    const phone = "1234567890";
    const generatedPassword = crypto.randomBytes(4).toString("hex");

    let emailSent = false;
    try {
        await sendWelcomeEmail(finalEmail, name, rollNumber, generatedPassword);
        emailSent = true;
    } catch (err) {
        console.error("[addStudent] Non-fatal error: Failed to send welcome email to", finalEmail, err);
    }

    console.log("Email Sent flag is:", emailSent);

    await mongoose.disconnect();
}

testAddStudent();
