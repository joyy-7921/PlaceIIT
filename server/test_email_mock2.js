require("dotenv").config();
const { sendWelcomeEmail, sendCocoWelcomeEmail } = require("./src/services/email.service");

async function run() {
    try {
        console.log("Testing Student Email...");
        await sendWelcomeEmail("student.test@placeiit.com", "Student Name", "12345678", "password123");
        console.log("Student Email Success");
    } catch (err) {
        console.error("Student Email Failed:", err.message);
    }

    try {
        console.log("Testing CoCo Email...");
        await sendCocoWelcomeEmail("coco.test@placeiit.com", "CoCo Name", "coco_username", "password123");
        console.log("CoCo Email Success");
    } catch (err) {
        console.error("CoCo Email Failed:", err.message);
    }
}

run();
