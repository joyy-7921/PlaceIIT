const User = require("../models/User.model");
const Coordinator = require("../models/Coordinator.model");
const crypto = require("crypto");
const { sendCocoWelcomeEmail } = require("./email.service");

const createCoco = async (data) => {
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

  const existingRoll = await Coordinator.findOne({ rollNumber });
  if (existingRoll) throw new Error(`Coordinator already exists with Roll Number: ${rollNumber}`);

  let nextX = await Coordinator.countDocuments() + 1;
  let instituteId = `coco${nextX}`;
  while (await User.exists({ instituteId })) {
    nextX++;
    instituteId = `coco${nextX}`;
  }

  const finalPassword = crypto.randomBytes(4).toString("hex");

  const user = await User.create({
    instituteId,
    email: finalEmail,
    password: finalPassword,
    role: "coco",
    mustChangePassword: true
  });

  const coco = await Coordinator.create({
    userId: user._id,
    name,
    rollNumber,
    contact,
  });

  try {
    await sendCocoWelcomeEmail(finalEmail, name, instituteId, finalPassword);
  } catch (emailErr) {
    console.error(`[createCoco] Failed to send welcome email to ${finalEmail}:`, emailErr);
    // Throw a specific error structure if we want the caller to know it succeeded partially
    throw new Error(`Account created successfully, but welcome email failed to send to ${finalEmail}`);
  }

  return { coco, credentials: { instituteId, password: finalPassword } };
};

module.exports = {
  createCoco,
};
