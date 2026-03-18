const express = require("express");
const router = express.Router();
const {
  getStats, getCompanies, addCompany, updateCompany,
  searchStudents, getCocos, addCoco, addStudent,
  assignCoco, removeCoco,
  uploadCompanyExcel, uploadShortlistExcel, uploadCocoExcel, uploadCocoRequirementsExcel, getUploadStatus,
  shortlistStudents, getShortlistedStudents, autoAllocateCocos, getCocoConflicts
} = require("../controllers/admin.controller");
const { protect } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const upload = require("../middlewares/excelUpload.middleware");

router.use(protect, authorize("admin"));

router.get("/stats", getStats);
router.get("/companies", getCompanies);
router.post("/companies", addCompany);
router.put("/companies/:id", updateCompany);
router.get("/students/search", searchStudents);
router.post("/students/shortlist", shortlistStudents);
router.post("/students", addStudent);
router.get("/companies/:id/students", getShortlistedStudents);
router.get("/cocos", getCocos);
router.post("/cocos", addCoco);
router.post("/assign-coco", assignCoco);
router.post("/remove-coco", removeCoco);
router.post("/upload/companies", upload.single("file"), uploadCompanyExcel);
router.post("/upload/shortlist", upload.single("file"), uploadShortlistExcel);
router.post("/upload/cocos", upload.single("file"), uploadCocoExcel);
router.post("/upload/coordinator-requirements", upload.single("file"), uploadCocoRequirementsExcel);
router.get("/upload/:id", getUploadStatus);
router.post("/auto-allocate-cocos", autoAllocateCocos);
router.get("/coco-conflicts", getCocoConflicts);

module.exports = router;
