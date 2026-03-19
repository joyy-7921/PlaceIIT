const XLSX = require("xlsx");
const Company = require("../models/Company.model");
const Student = require("../models/Student.model");
const User = require("../models/User.model");
const Coordinator = require("../models/Coordinator.model");
const ExcelUpload = require("../models/ExcelUpload.model");

const crypto = require("crypto");
const { sendWelcomeEmail, sendCocoWelcomeEmail } = require("./email.service");

const processCompanyExcel = async (uploadId, filePath) => {
  try {
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    let processed = 0;
    const problemList = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const norm = {};
        Object.keys(row).forEach(k => norm[k.trim().toLowerCase()] = row[k]);
        const name = norm["name"] || norm["company"] || "";
        if (!name) { problemList.push(`Row ${i+2}: Missing Name`); continue; }
        await Company.findOneAndUpdate({ name }, {
            name, day: parseInt(norm["day"]) || 1, slot: norm["slot"] || "Slot 1",
            venue: norm["venue"] || "TBA", mode: norm["mode"] || "online",
            totalRounds: parseInt(norm["totalrounds"]) || 1, isActive: true
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
        if (!roll) { problemList.push(`Row ${i+2}: Missing Roll`); continue; }
        const student = await Student.findOne({ rollNumber: roll });
        if (!student) { problemList.push(`Row ${i+2}: Student ${roll} not found`); continue; }
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

    let nextX = await Coordinator.countDocuments() + 1;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = String(row["Name"] || "").trim();
        const email = String(row["Email"] || "").trim().toLowerCase();
        const roll = String(row["Roll Number"] || "").trim();
        const phone = String(row["Phone Number"] || "").trim();

        if (!name || !email || !roll || !phone) { 
            problemList.push(`Row ${i+2}: Missing one of required fields (Name, Email, Roll Number, Phone Number)`); 
            continue; 
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            problemList.push(`Row ${i+2}: Invalid email format`);
            continue;
        }

        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone)) {
            problemList.push(`Row ${i+2}: Invalid phone number format (must be 10 digits)`);
            continue;
        }
        
        const existEmail = await User.findOne({ email });
        if (existEmail) { problemList.push(`Row ${i+2}: User with Email ${email} already exists`); continue; }

        const existRoll = await Coordinator.findOne({ rollNumber: roll });
        if (existRoll) { problemList.push(`Row ${i+2}: Coordinator with Roll Number ${roll} already exists`); continue; }

        let instituteId = `coco${nextX}`;
        while (await User.exists({ instituteId })) {
          nextX++;
          instituteId = `coco${nextX}`;
        }
        nextX++;

        const generatedPassword = crypto.randomBytes(4).toString("hex");

        const user = await User.create({ 
            instituteId, 
            email, 
            password: generatedPassword, 
            role: "coco",
            mustChangePassword: true
        });

        await Coordinator.create({ 
            userId: user._id, 
            name, 
            rollNumber: roll,
            contact: phone
        });

        try {
            await sendCocoWelcomeEmail(email, name, instituteId, generatedPassword);
        } catch (err) {
            console.error("[processCocoExcel] Failed to send email to", email, err);
            problemList.push(`Row ${i+2}: Account created but welcome email failed to send to ${email}`);
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
            problemList.push(`Row ${i+2}: Missing one of required fields (Name, Roll Number, Email ID, Phone Number)`); 
            continue; 
        }
        
        const instituteId = roll;
        const exist = await User.findOne({ $or: [{ instituteId }, { email }] });
        if (exist) { 
            problemList.push(`Row ${i+2}: User with Roll ${roll} or Email ${email} already exists`); 
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
            problemList.push(`Row ${i+2}: Account created but welcome email failed to send to ${email}`);
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
