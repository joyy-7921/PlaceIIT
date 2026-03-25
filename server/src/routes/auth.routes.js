const express = require("express");
const router = express.Router();
const { login, getMe, register, sendOtp, verifyOtp, resetPassword, changePassword } = require("../controllers/auth.controller");
const { protect } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/register", protect, authorize("admin"), register);
router.post("/change-password", protect, changePassword);

// Forgot password (OTP-based)
router.post("/forgot-password/send-otp", sendOtp);
router.post("/forgot-password/verify-otp", verifyOtp);
router.post("/forgot-password/reset", resetPassword);

module.exports = router;
