const mongoose = require("mongoose");

const panelSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    roundId: { type: mongoose.Schema.Types.ObjectId, ref: "InterviewRound", required: false },
    panelName: { type: String, required: true }, // e.g., "Panel A"
    interviewers: [{ type: String }], // Names of interviewers
    venue: { type: String },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ["occupied", "unoccupied"], default: "unoccupied" },
    currentStudent: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Panel", panelSchema);
