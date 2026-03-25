require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function main() {
  try {
    const info = await transporter.verify();
    console.log("SUCCESS: Nodemailer is authenticated and ready to send emails.");
  } catch (err) {
    console.error("FAIL: Authentication failed.", err.message);
    process.exit(1);
  }
}
main();
