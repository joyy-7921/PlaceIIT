const User = require("../models/User.model");
const Apc = require("../models/Apc.model");
const crypto = require("crypto");
const { sendApcWelcomeEmail } = require("./email.service");

const createApc = async (data) => {
  const { name, email, rollNumber, contact } = data;

  if (!name || !email || !rollNumber || !contact) {
    throw new Error("Name, Email, Roll Number, and Phone Number are required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) throw new Error(`Invalid email format: ${email}`);

  // Validate phone number format (must be 10 digits)
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(contact)) throw new Error(`Invalid phone number format for ${contact} (must be 10 digits)`);

  const finalEmail = email.toLowerCase();

  // Check if user already exists
  const existingEmail = await User.findOne({ email: finalEmail });
  if (existingEmail) throw new Error(`User already exists with email: ${finalEmail}`);

  const existingRoll = await Apc.findOne({ rollNumber });
  if (existingRoll) throw new Error(`APC already exists with Roll Number: ${rollNumber}`);

  let nextX = await Apc.countDocuments() + 1;
  let instituteId = `apc${nextX}`;
  while (await User.exists({ instituteId })) {
    nextX++;
    instituteId = `apc${nextX}`;
  }

  const finalPassword = crypto.randomBytes(4).toString("hex");

  const user = await User.create({
    instituteId,
    email: finalEmail,
    password: finalPassword,
    role: "admin",
    mustChangePassword: true,
  });

  const apc = await Apc.create({
    userId: user._id,
    name,
    rollNumber,
    contact,
  });

  let emailSent = false;
  try {
    await sendApcWelcomeEmail(finalEmail, name, instituteId, finalPassword);
    emailSent = true;
  } catch (emailErr) {
    console.error(`[createApc] Non-fatal: Failed to send welcome email to ${finalEmail}:`, emailErr);
  }

  return { apc, credentials: { instituteId, password: finalPassword }, emailSent };
};

module.exports = {
  createApc,
};
