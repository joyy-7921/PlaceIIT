const mongoose = require("mongoose");

const driveStateSchema = new mongoose.Schema(
  {
    currentDay: { type: Number, default: 1 },
    currentSlot: { type: String, enum: ["morning", "afternoon"], default: "morning" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DriveState", driveStateSchema);
