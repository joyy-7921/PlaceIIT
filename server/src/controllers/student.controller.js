const Student = require("../models/Student.model");
const Queue = require("../models/Queue.model");
const Company = require("../models/Company.model");
const Notification = require("../models/Notification.model");
const Query = require("../models/Query.model");
const User = require("../models/User.model");
const path = require("path");
const fs = require("fs");
const { sortCompaniesByPriority, buildPriorityMap } = require("../utils/priorityHelper");
const queueService = require("../services/queue.service");

// @desc    Get student profile
// @route   GET /api/student/profile
const getProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id })
      .populate("shortlistedCompanies", "name logo day slot venue mode currentRound");
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update student profile
// @route   PUT /api/student/profile
const updateProfile = async (req, res) => {
  try {
    const { contact, emergencyContact, friendContact, branch, batch, email } = req.body;
    const student = await Student.findOneAndUpdate(
      { userId: req.user.id },
      { contact, emergencyContact, friendContact, branch, batch, profileCompleted: true },
      { new: true }
    );
    if (!student) return res.status(404).json({ message: "Student not found" });
    // Update email on User model if provided
    if (email) {
      await User.findByIdAndUpdate(req.user.id, { email });
    }
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Upload student resume
// @route   POST /api/student/resume
const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const resumePath = req.file.path.replace(/\\/g, '/');

    const student = await Student.findOneAndUpdate(
      { userId: req.user.id },
      { resume: resumePath },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Resume uploaded successfully", resumePath: student.resume });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Download resume file with Content-Disposition: attachment
// @route   GET /api/student/resume/download
const downloadResume = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student || !student.resume) {
      return res.status(404).json({ message: "No resume found" });
    }

    const cleanPath = student.resume.replace(/\\/g, '/');
    const absPath = path.resolve(cleanPath);

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ message: "Resume file not found on server" });
    }

    const filename = path.basename(absPath);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    fs.createReadStream(absPath).pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get shortlisted companies sorted by priority (includes walk-in companies)
// @route   GET /api/student/companies
const getMyCompanies = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id })
      .populate("shortlistedCompanies");
    if (!student) return res.status(404).json({ message: "Student not found" });

    const priorityMap = buildPriorityMap(student.priorityOrder);
    const sorted = sortCompaniesByPriority(
      student.shortlistedCompanies.map((c) => ({ ...c.toObject(), companyId: c._id })),
      priorityMap
    );

    const allCompanies = sorted;

    // Attach queue info for each company
    const result = await Promise.all(
      allCompanies.map(async (company) => {
        const queueEntry = await Queue.findOne({
          companyId: company._id,
          studentId: student._id,
        });
        const totalInQueue = await Queue.countDocuments({
          companyId: company._id,
          status: "in_queue",
        });
        let liveQueueEntry = queueEntry ? queueEntry.toObject() : null;
        if (liveQueueEntry && liveQueueEntry.status === "in_queue") {
          const ahead = await Queue.countDocuments({
            companyId: company._id,
            status: "in_queue",
            position: { $lt: liveQueueEntry.position },
          });
          liveQueueEntry = { ...liveQueueEntry, position: ahead + 1 };
        }
        return { ...company, queueEntry: liveQueueEntry, totalInQueue };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Join queue for a company
// @route   POST /api/student/queue/join
const joinQueue = async (req, res) => {
  try {
    const { companyId } = req.body;
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const result = await queueService.joinQueue(student._id, companyId, false);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Join walk-in queue
// @route   POST /api/student/queue/walkin
const joinWalkIn = async (req, res) => {
  try {
    const { companyId } = req.body;
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const result = await queueService.joinQueue(student._id, companyId, true);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Leave queue for a company
// @route   POST /api/student/queue/leave
const leaveQueue = async (req, res) => {
  try {
    const { companyId } = req.body;
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const result = await queueService.leaveQueue(student._id, companyId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Get available walk-in companies
// @route   GET /api/student/walkins
const getWalkIns = async (req, res) => {
  try {
    const companies = await Company.find({ isWalkInEnabled: true, isActive: true });
    const student = await Student.findOne({ userId: req.user.id });

    const result = await Promise.all(
      companies.map(async (c) => {
        const totalInQueue = await Queue.countDocuments({
          companyId: c._id,
          status: "in_queue",
        });
        const queueEntry = student
          ? await Queue.findOne({ companyId: c._id, studentId: student._id })
          : null;
        let liveQueueEntry = queueEntry ? queueEntry.toObject() : null;
        if (liveQueueEntry && liveQueueEntry.status === "in_queue") {
          const ahead = await Queue.countDocuments({
            companyId: c._id,
            status: "in_queue",
            position: { $lt: liveQueueEntry.position },
          });
          liveQueueEntry = { ...liveQueueEntry, position: ahead + 1 };
        }
        return { ...c.toObject(), totalInQueue, queueEntry: liveQueueEntry };
      })
    );

    const terminalStatuses = ["completed", "offer_given", "rejected"];
    const filteredResult = result.filter(
      (c) => !c.queueEntry || !terminalStatuses.includes(c.queueEntry.status)
    );

    res.json(filteredResult);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get queue position for a company
// @route   GET /api/student/queue/:companyId
const getQueuePosition = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    const entry = await Queue.findOne({
      companyId: req.params.companyId,
      studentId: student._id,
    });
    if (!entry) return res.json({ inQueue: false });

    const ahead = await Queue.countDocuments({
      companyId: req.params.companyId,
      status: "in_queue",
      position: { $lt: entry.position },
    });
    res.json({ inQueue: true, position: entry.position, ahead, status: entry.status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get notifications
// @route   GET /api/student/notifications
const getNotifications = async (req, res) => {
  try {
    const notifs = await Notification.find({ recipientId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/student/notifications/:id/read
const markNotifRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Submit a query
// @route   POST /api/student/queries
const submitQuery = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message)
      return res.status(400).json({ message: "Subject and message are required" });

    const query = await Query.create({
      studentUserId: req.user.id,
      subject,
      message,
    });
    res.status(201).json(query);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get my queries
// @route   GET /api/student/queries
const getMyQueries = async (req, res) => {
  try {
    const queries = await Query.find({ studentUserId: req.user.id }).sort({ createdAt: -1 });
    res.json(queries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/student/notifications/read-all
const markAllNotifRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipientId: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Clear all notifications
// @route   DELETE /api/student/notifications
const clearAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipientId: req.user.id });
    res.json({ message: "All notifications cleared" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


module.exports = {
  getProfile, updateProfile, getMyCompanies,
  joinQueue, joinWalkIn, leaveQueue, getWalkIns, getQueuePosition,
  getNotifications, markNotifRead, markAllNotifRead, clearAllNotifications,
  submitQuery, getMyQueries,
  uploadResume, downloadResume,
};
