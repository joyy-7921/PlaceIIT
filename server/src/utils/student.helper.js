const Queue = require("../models/Queue.model");
const { STUDENT_STATUS } = require("./constants");

/**
 * Augments an array of Mongoose student documents with their current
 * active queue or interview status.
 *
 * @param {Array} students - Array of Student mongoose documents
 * @returns {Promise<Array>} - Array of augmented student objects
 */
const withQueueStatus = async (students) => {
    if (!students || students.length === 0) return [];

    const studentIds = students.map((s) => s._id);

    // Find all active queue entries for these students
    // Active is defined as IN_QUEUE or IN_INTERVIEW
    const activeQueues = await Queue.find({
        studentId: { $in: studentIds },
        status: { $in: [STUDENT_STATUS.IN_QUEUE, STUDENT_STATUS.IN_INTERVIEW] }
    }).populate("companyId", "name venue");

    // Create a map for fast lookup
    const queueMap = {};
    for (const q of activeQueues) {
        queueMap[q.studentId.toString()] = q;
    }

    // Map the students and attach the status safely
    return students.map((studentDoc) => {
        const s = typeof studentDoc.toObject === "function" ? studentDoc.toObject() : studentDoc;
        const q = queueMap[s._id.toString()];

        if (q && q.companyId) {
            if (q.status === STUDENT_STATUS.IN_INTERVIEW) {
                s.inInterview = true;
                s.interviewWith = q.companyId.name;
                s.interviewVenue = q.companyId.venue || "TBA";
            } else if (q.status === STUDENT_STATUS.IN_QUEUE) {
                s.inInterview = false;
                s.queuedFor = q.companyId.name;
            }
        } else {
            s.inInterview = false;
        }

        return s;
    });
};

module.exports = {
    withQueueStatus,
};
