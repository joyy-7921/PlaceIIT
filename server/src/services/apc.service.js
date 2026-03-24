const User = require("../models/User.model");
const Apc = require("../models/Apc.model");
const crypto = require("crypto");
// Using the same email sender for simplicity or creating a new one. We can reuse sendCocoWelcomeEmail or make sendApcWelcomeEmail
const { sendWelcomeEmail } = require("./email.service"); // let's just use existing ones

const createApc = async (data) => {
  const { name, email, contact, rollNumber } = data; // accept rollNumber as instituteId for legacy compat

  if (!name || !email || !contact) {
    throw new Error("Name, Email, and Phone Number are required");
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

  let instituteId = rollNumber;
  if (!instituteId) {
    let nextX = await Apc.countDocuments() + 1;
    instituteId = `apc${nextX}`;
    while (await User.exists({ instituteId })) {
      nextX++;
      instituteId = `apc${nextX}`;
    }
  }

  const existingInstituteId = await User.findOne({ instituteId });
  if (existingInstituteId) throw new Error(`User already exists with Institute ID: ${instituteId}`);

  const finalPassword = crypto.randomBytes(4).toString("hex");

  const user = await User.create({
    instituteId,
    email: finalEmail,
    password: finalPassword,
    role: "admin",
    isMainAdmin: false,
    mustChangePassword: true
  });

  const apc = await Apc.create({
    userId: user._id,
    name,
    contact,
  });

  try {
     // Reusing the welcome email structure used for students for simplicity, since it takes email, name, instituteId, password
    await sendWelcomeEmail(finalEmail, name, instituteId, finalPassword);
  } catch (emailErr) {
    console.error(`[createApc] Failed to send welcome email to ${finalEmail}:`, emailErr);
    throw new Error(`Account created successfully, but welcome email failed to send to ${finalEmail}`);
  }

  return { apc, credentials: { instituteId, password: finalPassword } };
};

module.exports = {
  createApc,
};
