import express from "express";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import nodemailer from "nodemailer";

// Vercel Serverless Function entry point
const app = express();

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://mktmusichouse2024_db_user:Phongmktmusichouse@musichouse.1xgo303.mongodb.net/musichouse?retryWrites=true&w=majority";
const ADMIN_TOKEN = "admin_token_Phongmktmusichouse_2026";

let isConnected = false;
async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
  } catch (e) {
    console.error("DB Connect error", e);
  }
}

const ConfigSchema = new mongoose.Schema({
  votingEnabled: { type: Boolean, default: true },
  countdownEnd: { type: String, default: null },
  logoUrl: { type: String, default: "/logo.svg" },
  programName: { type: String, default: "Vinh Danh Nhà Giáo" },
  programSubtitle: { type: String, default: "Music House" },
  programDescription: { type: String, default: "Cơ hội để các học viên tri ân những cống hiến thầm lặng và bầu chọn cho người thầy được yêu thích nhất." },
  maxVotesPerCategory: { type: Number, default: 3 },
  maxVotesPerDevice: { type: Number, default: 3 },
  pageTitle: { type: String, default: "MUSIC HOUSE VOTE" },
  hideResults: { type: Boolean, default: false },
  candidateTerm: { type: String, default: "Giáo viên" },
  subjectTerm: { type: String, default: "Bộ môn / Thể loại" },
  bgMusicUrl: { type: String, default: "" },
  voteSoundUrl: { type: String, default: "" }
}, { timestamps: true });

const TeacherSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  category: { type: String, required: true },
  imageUrl: { type: String, required: true },
  bio: { type: String, default: "" },
  votesCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 }
}, { timestamps: true });

const VoteSchema = new mongoose.Schema({
  teacherId: { type: String, required: true },
  email: { type: String, required: true },
  userName: { type: String, default: "Học viên" },
  userPicture: { type: String, default: "" },
  deviceId: { type: String, default: "" },
  ip: { type: String, default: "" }
}, { timestamps: true });

const ConfigModel = mongoose.models.Config || mongoose.model("Config", ConfigSchema);
const TeacherModel = mongoose.models.Teacher || mongoose.model("Teacher", TeacherSchema);
const VoteModel = mongoose.models.Vote || mongoose.model("Vote", VoteSchema);

app.get("/api/teachers", async (req, res) => {
  try {
    await connectDB();
    const configDoc = await ConfigModel.findOne().lean() || {
      votingEnabled: true,
      maxVotesPerCategory: 3,
      maxVotesPerDevice: 3,
      programName: "Tiết Mục Xuất Sắc Nhất",
      candidateTerm: "TIẾT MỤC"
    };
    let teachers = await TeacherModel.find().lean();
    if (!teachers || teachers.length === 0) {
      // Return fallback teachers if DB empty
      teachers = [];
    }
    if (configDoc.hideResults) {
      teachers = teachers.map((t: any) => ({ ...t, votesCount: -1 }));
    }
    res.json({
      teachers,
      votingEnabled: configDoc.votingEnabled ?? true,
      countdownEnd: configDoc.countdownEnd ?? null,
      config: configDoc,
      totalPageViews: 2350,
      activeOnline: 5
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error" });
  }
});

app.post("/api/vote", async (req, res) => {
  try {
    await connectDB();
    const { teacherId, user, deviceId } = req.body;
    const clientIp = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "").split(",")[0].trim();
    const email = user?.email || "anonymous@voter";
    const userName = user?.name || "Khán giả";
    
    const configDoc = await ConfigModel.findOne().lean();
    const maxVotes = configDoc?.maxVotesPerDevice || 3;

    // Check existing votes
    const existingDeviceVotes = await VoteModel.find({ deviceId }).lean();
    if (existingDeviceVotes.length >= maxVotes) {
      return res.json({ success: false, message: `Bạn đã dùng hết ${maxVotes} lượt bình chọn!` });
    }

    const alreadyVotedTarget = existingDeviceVotes.some(v => v.teacherId === teacherId);
    if (alreadyVotedTarget) {
      return res.json({ success: false, message: "Bạn đã bình chọn cho tiết mục này rồi!" });
    }

    // Save vote
    await VoteModel.create({ teacherId, email, userName, deviceId, ip: clientIp });
    const updatedTeacher = await TeacherModel.findOneAndUpdate({ id: teacherId }, { $inc: { votesCount: 1 } }, { new: true });
    const teachers = await TeacherModel.find().lean();

    res.json({
      success: true,
      message: `Bình chọn thành công cho ${updatedTeacher?.name || "tiết mục"}!`,
      teachers
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi bình chọn" });
  }
});

export default app;
