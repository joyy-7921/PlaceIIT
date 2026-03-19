const XLSX = require("xlsx");
const Company = require("../models/Company.model");
const Student = require("../models/Student.model");
const User = require("../models/User.model");
const Coordinator = require("../models/Coordinator.model");
const ExcelUpload = require("../models/ExcelUpload.model");

const crypto = require("crypto");
const { sendWelcomeEmail } = require("./email.service");

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
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    let processed = 0;
    const problemList = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const norm = {};
        Object.keys(row).forEach(k => norm[k.trim().toLowerCase()] = row[k]);
        const name = norm["name"] || "";
        const roll = norm["roll"] || norm["rollnumber"] || "";
        if (!name || !roll) { problemList.push(`Row ${i+2}: Missing Name or Roll`); continue; }
        
        const instituteId = roll;
        const exist = await User.findOne({ instituteId });
        if (exist) { problemList.push(`Row ${i+2}: User ${roll} exists`); continue; }

        const user = await User.create({ instituteId, email: `${roll}@placeiit.in`, password: "coco123", role: "coco" });
        await Coordinator.create({ userId: user._id, name, rollNumber: roll });
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
