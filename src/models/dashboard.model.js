import mongoose from "mongoose";
const { Schema } = mongoose;

const DashboardSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  profileClicks: { type: Number, default: 0 },
  profileVisitors: [{ type: Schema.Types.ObjectId, ref: "User" }],
  followers: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  reviews: [
    {
      student: { type: Schema.Types.ObjectId, ref: "User" },
      rating: Number,
      comment: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  sessionsGiven: { type: Number, default: 0 },
  sessionHours: { type: Number, default: 0 },
  upcomingEvents: [
    {
      date: Date,
      title: String
    }
  ],
  skills: [
    {
      name: { type: String },
      level: { type: Number, default: 1 }
    }
  ],
  profileClicksHistory: [{ type: Number }], // e.g. clicks per day/week
  feedbackSummary: {
    excellentPercent: { type: Number, default: 0 },
    recommendPercent: { type: Number, default: 0 }
  },
  searchAppearances: { type: Number, default: 0 },
  messagesSent: { type: Number, default: 0 },
  messagesReceived: { type: Number, default: 0 }
}, { timestamps: true });

export const Dashboard = mongoose.model("Dashboard", DashboardSchema);
