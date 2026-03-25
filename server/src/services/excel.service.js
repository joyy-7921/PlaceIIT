const XLSX = require("xlsx");
const Company = require("../models/Company.model");
const Student = require("../models/Student.model");
const User = require("../models/User.model");
const Coordinator = require("../models/Coordinator.model");
const ExcelUpload = require("../models/ExcelUpload.model");

const crypto = require("crypto");
const { sendWelcomeEmail, sendCocoWelcomeEmail } = require("./email.service");
const { createCoco } = require("./coco.service");

const processCompanyExcel = async (uploadId, filePath) => {
  try {
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];

    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (rawData.length === 0) throw new Error("Excel file is empty");

    const headers = rawData[0].map(h => String(h).trim());
    if (
      headers[0]?.toLowerCase() !== "company name" ||
      headers[1]?.toLowerCase() !== "day" ||
      headers[2]?.toLowerCase() !== "slot" ||
      headers[3]?.toLowerCase() !== "venue"
    ) {
      throw new Error("Invalid Excel format. Required columns: Company Name, Day, Slot, Venue");
    }

    let processed = 0;
    const problemList = [];

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0 || row.every(cell => !String(cell).trim())) continue;

      let companyName = String(row[0] || "").trim();
      let dayRaw = String(row[1] || "").trim();
      let slotRaw = String(row[2] || "").trim();
      let venue = String(row[3] || "").trim();

      if (!companyName || !dayRaw || !slotRaw || !venue) {
        problemList.push(`Row ${i + 1}: Missing required fields`);
        continue;
      }

      let day = parseInt(dayRaw.replace(/\D/g, ""));
      if (isNaN(day)) day = 1; // Default to Day 1 if parse fails

      // Normalize Slot
      let slot = slotRaw.toLowerCase();
      if (slot.includes("morning") || slot.includes("am")) {
        slot = "morning";
      } else if (slot.includes("afternoon") || slot.includes("pm")) {
        slot = "afternoon";
      } else if (slot.includes("evening")) {
        slot = "evening";
      } else {
        slot = "morning"; // fallback
      }

      await Company.findOneAndUpdate({ name: companyName }, {
        name: companyName,
        day: day,
        slot: slot,
        venue: venue,
        isActive: true
      }, { upsert: true });

      processed++;
    }

    await ExcelUpload.findByIdAndUpdate(uploadId, { status: "success", recordsProcessed: processed, problemList });
    return { processed, problemList };
  } catch (err) {
    await ExcelUpload.findByIdAndUpdate(uploadId, { status: "failed", problemList: [err.message] });
    throw err;
  }
};

const processShortlistExcel = async (uploadId, filePath, companyId) => {
  try {
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    let processed = 0;
    const problemList = [];
    const company = await Company.findById(companyId);
    if (!company) throw new Error("Company not found");

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const norm = {};
      Object.keys(row).forEach(k => norm[k.trim().toLowerCase()] = row[k]);
      const roll = norm["roll"] || norm["rollnumber"] || "";
      if (!roll) { problemList.push(`Row ${i + 2}: Missing Roll`); continue; }
      const student = await Student.findOne({ rollNumber: roll });
      if (!student) { problemList.push(`Row ${i + 2}: Student ${roll} not found`); continue; }
      await Company.findByIdAndUpdate(companyId, { $addToSet: { shortlistedStudents: student._id } });
      await Student.findByIdAndUpdate(student._id, { $addToSet: { shortlistedCompanies: companyId } });
      processed++;
    }
    await ExcelUpload.findByIdAndUpdate(uploadId, { status: "success", recordsProcessed: processed, problemList });
    return { processed, problemList };
  } catch (err) {
    await ExcelUpload.findByIdAndUpdate(uploadId, { status: "failed", problemList: [err.message] });
    throw err;
  }
};

const processCocoExcel = async (uploadId, filePath) => {
  try {
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];

    // Validate headers exactly
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (rawData.length === 0) throw new Error("Excel file is empty");
    const headers = rawData[0].map(h => String(h).trim());
    if (headers[0] !== "Name" || headers[1] !== "Email" || headers[2] !== "Roll Number" || headers[3] !== "Phone Number") {
      throw new Error("Invalid Excel format. Required columns: Name, Email, Roll Number, Phone Number");
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    let processed = 0;
    const problemList = [];

    console.log("Rows parsed:", rows.length);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = String(row["Name"] || "").trim();
      const email = String(row["Email"] || "").trim().toLowerCase();
      const roll = String(row["Roll Number"] || "").trim();
      const phone = String(row["Phone Number"] || "").trim();

      if (!name || !email || !roll || !phone) {
        problemList.push(`Row ${i + 2}: Missing one of required fields (Name, Email, Roll Number, Phone Number)`);
        continue;
      }

      console.log(`Processing Row ${i + 2}:`, email);

      try {
        await createCoco({ name, email, rollNumber: roll, contact: phone });
        processed++;
      } catch (err) {
        console.error(`[processCocoExcel] Error on Row ${i + 2}:`, err.message);
        problemList.push(`Row ${i + 2}: ${err.message}`);
        // If it partially succeeded but email failed, we can still count it
        if (err.message.includes("Account created successfully")) {
          processed++;
        }
      }
    }
    await ExcelUpload.findByIdAndUpdate(uploadId, { status: "success", recordsProcessed: processed, problemList });
    return { processed, problemList };
  } catch (err) {
    await ExcelUpload.findByIdAndUpdate(uploadId, { status: "failed", problemList: [err.message] });
    throw err;
  }
};

const processStudentExcel = async (uploadId, filePath) => {
  try {
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    // Header should be: Name, Roll Number, Email ID, Phone Number
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    let processed = 0;
    const problemList = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const norm = {};
      Object.keys(row).forEach(k => norm[k.trim().toLowerCase()] = row[k]);

      const name = norm["name"] || "";
      const roll = norm["roll number"] || norm["roll"] || norm["rollnumber"] || "";
      const email = norm["email id"] || norm["email"] || "";
      const phone = norm["phone number"] || norm["phone"] || norm["contact"] || "";

      if (!name || !roll || !email || !phone) {
        problemList.push(`Row ${i + 2}: Missing one of required fields (Name, Roll Number, Email ID, Phone Number)`);
        continue;
      }

      const instituteId = roll;
      const exist = await User.findOne({ $or: [{ instituteId }, { email }] });
      if (exist) {
        problemList.push(`Row ${i + 2}: User with Roll ${roll} or Email ${email} already exists`);
        continue;
      }

      const generatedPassword = crypto.randomBytes(4).toString("hex");

      const user = await User.create({
        instituteId,
        email,
        password: generatedPassword,
        role: "student",
        mustChangePassword: true
      });

      await Student.create({
        userId: user._id,
        name,
        rollNumber: roll,
        phone
      });

      try {
        await sendWelcomeEmail(email, name, roll, generatedPassword);
      } catch (err) {
        console.error("[processStudentExcel] Failed to send email to", email, err);
        problemList.push(`Row ${i + 2}: Account created but welcome email failed to send to ${email}`);
      }

      processed++;
    }
    await ExcelUpload.findByIdAndUpdate(uploadId, { status: "success", recordsProcessed: processed, problemList });
    return { processed, problemList };
  } catch (err) {
    await ExcelUpload.findByIdAndUpdate(uploadId, { status: "failed", problemList: [err.message] });
    throw err;
  }
};

module.exports = { processCompanyExcel, processShortlistExcel, processCocoExcel, processStudentExcel };
