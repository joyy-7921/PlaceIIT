const express = require("express");
const router = express.Router();
const {
  getAssignedCompany, getShortlistedStudents, addStudentToQueue,
  updateStudentStatus, sendNotification, toggleWalkIn,
  addPanel, getPanels, getRounds, addRound, getPredefinedNotifications,
  searchAllStudents, addStudentToRound,
} = require("../controllers/coco.controller");
const { protect } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

router.use(protect, authorize("coco"));

router.get("/company", getAssignedCompany);
router.get("/company/:companyId/students", getShortlistedStudents);
router.get("/company/:companyId/rounds", getRounds);
router.get("/company/:companyId/panels", getPanels);
router.put("/company/:companyId/walkin", toggleWalkIn);
router.post("/queue/add", addStudentToQueue);
router.put("/queue/status", updateStudentStatus);
router.post("/notify", sendNotification);
router.get("/notifications/predefined", getPredefinedNotifications);
router.post("/panel", addPanel);
router.post("/round", addRound);
router.post("/round/add-student", addStudentToRound);
router.get("/students/search", searchAllStudents);

module.exports = router;
