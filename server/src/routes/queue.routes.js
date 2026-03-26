const express = require("express");
const router = express.Router();
const {
    getQueue, getPendingRequests,
    updateQueueStatus, acceptRequest, rejectRequest,
} = require("../controllers/queue.controller");
const { protect } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

router.use(protect);

router.get("/:companyId", getQueue);
router.get("/:companyId/pending", authorize("coco", "admin"), getPendingRequests);
router.put("/status", authorize("coco", "admin"), updateQueueStatus);
router.put("/accept", authorize("coco", "admin"), acceptRequest);
router.put("/reject", authorize("coco", "admin"), rejectRequest);

module.exports = router;
