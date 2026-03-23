const Queue = require("../models/Queue.model");
const Company = require("../models/Company.model");
const Student = require("../models/Student.model");
const { STUDENT_STATUS, SOCKET_EVENTS } = require("../utils/constants");
const { getIO } = require("../config/socket");

const joinQueue = async (studentId, companyId, isWalkIn = false) => {
  const company = await Company.findById(companyId);
  if (!company) throw new Error("Company not found");

  // Walk-in check
  if (isWalkIn && !company.isWalkInEnabled)
    throw new Error("Walk-in is not enabled for this company");

  // Check if shortlisted (skip for walk-in)
  if (!isWalkIn) {
    const student = await Student.findById(studentId);
    if (!student.shortlistedCompanies.includes(companyId))
      throw new Error("Student is not shortlisted for this company");
  }

  // If student already has a stale entry for THIS company (completed/rejected), remove it
  const existing = await Queue.findOne({ companyId, studentId });
  if (existing) {
    if ([STUDENT_STATUS.COMPLETED, STUDENT_STATUS.REJECTED].includes(existing.status)) {
      await Queue.findByIdAndDelete(existing._id);
    } else if (existing.status === STUDENT_STATUS.IN_QUEUE || existing.status === STUDENT_STATUS.IN_INTERVIEW) {
      throw new Error("You are already in this company's queue");
    }
  }

  // AUTO-SWITCH: Remove from any other active queue
  const activeEntries = await Queue.find({
    studentId,
    status: { $in: [STUDENT_STATUS.IN_QUEUE, STUDENT_STATUS.IN_INTERVIEW] },
  });

  for (const activeEntry of activeEntries) {
    const oldCompanyId = activeEntry.companyId;
    await Queue.findByIdAndDelete(activeEntry._id);
    try {
      getIO().to(`company:${oldCompanyId}`).emit(SOCKET_EVENTS.QUEUE_UPDATED, {
        companyId: oldCompanyId, action: "left", studentId,
      });
      const st = await Student.findById(studentId);
      if (st) {
        getIO().to(`user:${st.userId}`).emit(SOCKET_EVENTS.STATUS_UPDATED, {
          companyId: oldCompanyId, status: "not_joined",
        });
      }
    } catch (_) {}
  }

  // Get next position
  const lastEntry = await Queue.findOne({ companyId, status: STUDENT_STATUS.IN_QUEUE })
    .sort({ position: -1 });
  const position = (lastEntry?.position || 0) + 1;

  const entry = await Queue.create({
    companyId,
    studentId,
    status: STUDENT_STATUS.IN_QUEUE,
    position,
    isWalkIn,
    joinedAt: new Date(),
  });

  // Emit real-time update
  try {
    getIO().to(`company:${companyId}`).emit(SOCKET_EVENTS.QUEUE_UPDATED, {
      companyId,
      action: "joined",
      entry,
    });
  } catch (_) {}

  return entry;
};

const leaveQueue = async (studentId, companyId) => {
  const entry = await Queue.findOne({ companyId, studentId });
  if (!entry) throw new Error("Not in queue for this company");

  await Queue.findByIdAndDelete(entry._id);

  try {
    getIO().to(`company:${companyId}`).emit(SOCKET_EVENTS.QUEUE_UPDATED, {
      companyId, action: "left", studentId,
    });
  } catch (_) {}

  return { message: "Left queue successfully" };
};

const updateStatus = async (studentId, companyId, status, roundId = null, panelId = null) => {
  const entry = await Queue.findOne({ companyId, studentId }).populate("studentId");
  if (!entry) throw new Error("Queue entry not found");

  entry.status = status;
  if (roundId) entry.roundId = roundId;
  if (panelId) entry.panelId = panelId;
  if (status === STUDENT_STATUS.IN_INTERVIEW) entry.interviewStartedAt = new Date();
  if ([STUDENT_STATUS.COMPLETED, STUDENT_STATUS.REJECTED].includes(status))
    entry.completedAt = new Date();

  await entry.save();

  try {
    getIO().to(`company:${companyId}`).emit(SOCKET_EVENTS.STATUS_UPDATED, {
      companyId, studentId, status,
    });
    // Notify the student personally - use userId for consistency with client room name
    getIO().to(`user:${entry.studentId.userId}`).emit(SOCKET_EVENTS.STATUS_UPDATED, {
      companyId, status,
    });
  } catch (_) {}

  return entry;
};

const getQueue = async (companyId) => {
  return Queue.find({ companyId })
    .populate("studentId", "name rollNumber contact")
    .populate("roundId", "roundName roundNumber")
    .populate("panelId", "panelName")
    .sort({ position: 1 });
};

module.exports = { joinQueue, leaveQueue, updateStatus, getQueue };
