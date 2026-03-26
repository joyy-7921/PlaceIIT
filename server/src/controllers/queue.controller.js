const queueService = require("../services/queue.service");

// @desc    Get full queue for a company (all statuses)
// @route   GET /api/queue/:companyId
const getQueue = async (req, res) => {
  try {
    const queue = await queueService.getQueue(req.params.companyId);
    res.json(queue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get pending requests for a company
// @route   GET /api/queue/:companyId/pending
const getPendingRequests = async (req, res) => {
  try {
    const entries = await queueService.getPendingRequests(req.params.companyId);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update queue entry status (generic)
// @route   PUT /api/queue/status
const updateQueueStatus = async (req, res) => {
  try {
    const { studentId, companyId, status, roundId, panelId } = req.body;
    const result = await queueService.updateStatus(studentId, companyId, status, roundId, panelId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Accept a pending queue request (COCO / admin)
// @route   PUT /api/queue/accept
const acceptRequest = async (req, res) => {
  try {
    const { studentId, companyId } = req.body;
    const result = await queueService.acceptQueueRequest(studentId, companyId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Reject a pending queue request (COCO / admin)
// @route   PUT /api/queue/reject
const rejectRequest = async (req, res) => {
  try {
    const { studentId, companyId } = req.body;
    const result = await queueService.rejectQueueRequest(studentId, companyId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { getQueue, getPendingRequests, updateQueueStatus, acceptRequest, rejectRequest };
