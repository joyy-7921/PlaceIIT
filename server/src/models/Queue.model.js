const mongoose = require("mongoose");
const { STUDENT_STATUS } = require("../utils/constants");
const queueEntrySchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    roundId: { type: mongoose.Schema.Types.ObjectId, ref: "InterviewRound" },
    round: { type: String, required: true, default: "Round 1" }, // E.g. "Round 1", "Round 2"
    panelId: { type: mongoose.Schema.Types.ObjectId, ref: "Panel" },
    status: {
      type: String,
      enum: Object.values(STUDENT_STATUS),
      default: STUDENT_STATUS.NOT_JOINED,
    },
    position: { type: Number },
    isWalkIn: { type: Boolean, default: false },
    joinedAt: { type: Date },
    interviewStartedAt: { type: Date },
    completedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

// We need to drop the old strictly company+student index if it exists,
// so students can exist in Round 1 and Round 2 simultaneously.


// Drop old index safely when model is registered
queueEntrySchema.on("index", async (error) => {
  if (!error) {
    try {
      await mongoose.model("Queue").collection.dropIndex("companyId_1_studentId_1");
      console.log("Successfully dropped legacy queue index: companyId_1_studentId_1");
    } catch (e) {
      // Ignored if index doesn't exist
    }
  }
});

// New Compound index for quick lookup + uniqueness across rounds
queueEntrySchema.index({ companyId: 1, studentId: 1, round: 1 }, { unique: true });

module.exports = mongoose.model("Queue", queueEntrySchema);
