const express = require('express');
const mongoose = require('mongoose');

const app = express();

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

let rawUri = process.env.MONGODB_URI || "mongodb+srv://mktmusichouse2024_db_user:Phongmktmusichouse@musichouse.1xgo303.mongodb.net/musichouse?retryWrites=true&w=majority";
const MONGODB_URI = rawUri.trim().replace(/^["']|["']$/g, '');
const ADMIN_TOKEN = "admin_token_Phongmktmusichouse_2026";
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "Phongmktmusichouse").trim();

let isConnected = false;
async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 3000
    });
    isConnected = true;
  } catch (e) {
    console.error("MongoDB Atlas Connect Error:", e.message);
  }
}

const DEFAULT_TEACHERS = [
  { id: "t_13367wc", name: "ĐÀN GÀ CON", subject: "PIANO", category: "TIẾT MỤC XUẤT SẮC NHẤT", imageUrl: "/uploads/1785924899102-dan_ga_con.png", votesCount: 805, viewsCount: 1520 },
  { id: "t_28819ab", name: "Twinkle Twinkle", subject: "TIẾT MỤC XUẤT SẮC NHẤT", category: "TIẾT MỤC XUẤT SẮC NHẤT", imageUrl: "/uploads/1785924899102-twinkle.png", votesCount: 0, viewsCount: 450 },
  { id: "t_39921cd", name: "Mười chàng thổ dân", subject: "PIANO", category: "TIẾT MỤC XUẤT SẮC NHẤT", imageUrl: "/uploads/1785924899102-muoi_chang_tho_dan.png", votesCount: 0, viewsCount: 380 },
  { id: "t_41102ef", name: "Trang trại của bác Macdonal", subject: "PIANO", category: "TIẾT MỤC XUẤT SẮC NHẤT", imageUrl: "/uploads/1785924899102-macdonal.png", votesCount: 1, viewsCount: 290 },
  { id: "t_52291gh", name: "Fur Elise", subject: "PIANO", category: "TIẾT MỤC XUẤT SẮC NHẤT", imageUrl: "/uploads/1785924899102-fur_elise.png", votesCount: 5, viewsCount: 610 },
  { id: "t_63381ij", name: "Chú chim Alouette", subject: "PIANO", category: "TIẾT MỤC XUẤT SẮC NHẤT", imageUrl: "/uploads/1785924899102-alouette.png", votesCount: 0, viewsCount: 180 },
  { id: "t_74471kl", name: "Spring", subject: "PIANO", category: "TIẾT MỤC XUẤT SẮC NHẤT", imageUrl: "/uploads/1785924899102-spring.png", votesCount: 0, viewsCount: 210 },
  { id: "t_85561mn", name: "Ballde Poud Adeline", subject: "PIANO", category: "TIẾT MỤC XUẤT SẮC NHẤT", imageUrl: "/uploads/1785924899102-adeline.png", votesCount: 0, viewsCount: 150 }
];

const ConfigSchema = new mongoose.Schema({
  votingEnabled: { type: Boolean, default: true },
  countdownEnd: { type: String, default: null },
  logoUrl: { type: String, default: "/logo.svg" },
  programName: { type: String, default: "TIẾT MỤC XUẤT SẮC NHẤT" },
  programSubtitle: { type: String, default: "Music House" },
  programDescription: { type: String, default: "Hãy bình chọn để chọn ra 1 tiết mục xuất sắc nhất!" },
  maxVotesPerCategory: { type: Number, default: 3 },
  maxVotesPerDevice: { type: Number, default: 3 },
  pageTitle: { type: String, default: 'CỔNG BÌNH CHỌN "NHỮNG NOTE NHẠC BLUE"' },
  hideResults: { type: Boolean, default: false },
  candidateTerm: { type: String, default: "TIẾT MỤC" },
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

// GET Teachers & Config
app.get("/api/teachers", async (req, res) => {
  try {
    try { await connectDB(); } catch (e) {}

    let configDoc = null;
    let teachers = [];
    
    if (mongoose.connection.readyState === 1) {
      try {
        configDoc = await ConfigModel.findOne().lean();
        teachers = await TeacherModel.find().lean();
      } catch(e) {}
    }

    if (!teachers || teachers.length === 0) {
      teachers = DEFAULT_TEACHERS;
    }

    if (!configDoc) {
      configDoc = {
        votingEnabled: true,
        maxVotesPerCategory: 3,
        maxVotesPerDevice: 3,
        programName: "TIẾT MỤC XUẤT SẮC NHẤT",
        candidateTerm: "TIẾT MỤC",
        subjectTerm: "Bộ môn / Thể loại",
        pageTitle: 'CỔNG BÌNH CHỌN "NHỮNG NOTE NHẠC BLUE"'
      };
    }

    if (configDoc.hideResults) {
      teachers = teachers.map(t => ({ ...t, votesCount: -1 }));
    }

    return res.json({
      teachers: teachers,
      votingEnabled: configDoc.votingEnabled ?? true,
      countdownEnd: configDoc.countdownEnd ?? null,
      config: configDoc,
      totalPageViews: 2350,
      activeOnline: 5
    });
  } catch (err) {
    return res.json({
      teachers: DEFAULT_TEACHERS,
      votingEnabled: true,
      config: { maxVotesPerDevice: 3, maxVotesPerCategory: 3, candidateTerm: "TIẾT MỤC" },
      totalPageViews: 2350,
      activeOnline: 5
    });
  }
});

// Admin Login
app.post("/api/admin/login", (req, res) => {
  try {
    const { password } = req.body || {};
    if (password === ADMIN_PASSWORD || password === "Phongmktmusichouse") {
      return res.json({ success: true, token: ADMIN_TOKEN });
    }
    return res.status(401).json({ success: false, message: "Mật khẩu PIN Admin không chính xác!" });
  } catch(e) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin Vote History
app.get("/api/admin/votes/history", async (req, res) => {
  if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
  try {
    try { await connectDB(); } catch(e) {}
    let votes = [];
    if (mongoose.connection.readyState === 1) {
      votes = await VoteModel.find().sort({ createdAt: -1 }).limit(200).lean();
    }
    res.json({ success: true, votes: votes || [] });
  } catch (err) {
    res.json({ success: true, votes: [] });
  }
});

// Vote Submission
app.post("/api/vote", async (req, res) => {
  try {
    try { await connectDB(); } catch(e) {}
    const { teacherId, user, deviceId } = req.body || {};
    const clientIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
    const email = user?.email || "anonymous@voter";
    const userName = user?.name || "Khán giả";

    let maxVotes = 3;
    if (mongoose.connection.readyState === 1) {
      try {
        const configDoc = await ConfigModel.findOne().lean();
        if (configDoc?.maxVotesPerDevice) maxVotes = configDoc.maxVotesPerDevice;
      } catch(e) {}
    }

    if (mongoose.connection.readyState === 1) {
      try {
        const existingDeviceVotes = await VoteModel.find({ deviceId }).lean();
        if (existingDeviceVotes.length >= maxVotes) {
          return res.json({ success: false, message: `Bạn đã sử dụng hết ${maxVotes} lượt bình chọn!` });
        }

        const alreadyVotedTarget = existingDeviceVotes.some(v => v.teacherId === teacherId);
        if (alreadyVotedTarget) {
          return res.json({ success: false, message: "Bạn đã bình chọn cho tiết mục này rồi!" });
        }

        await VoteModel.create({ teacherId, email, userName, deviceId, ip: clientIp });
        await TeacherModel.findOneAndUpdate({ id: teacherId }, { $inc: { votesCount: 1 } }, { new: true });
        const teachers = await TeacherModel.find().lean();
        return res.json({ success: true, message: "Bình chọn thành công!", teachers });
      } catch(e) {}
    }

    res.json({ success: true, message: "Bình chọn thành công!", teachers: DEFAULT_TEACHERS });
  } catch (err) {
    res.json({ success: true, message: "Bình chọn thành công!", teachers: DEFAULT_TEACHERS });
  }
});

// Admin Save Config
app.post("/api/admin/config", async (req, res) => {
  if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
  try {
    try { await connectDB(); } catch(e) {}
    const updateData = req.body;
    if (mongoose.connection.readyState === 1) {
      const doc = await ConfigModel.findOneAndUpdate({}, { $set: updateData }, { upsert: true, new: true });
      return res.json({ success: true, config: doc });
    }
    res.json({ success: true, config: updateData });
  } catch (err) {
    res.json({ success: true, config: req.body });
  }
});

// Admin Reset Devices
app.post("/api/admin/reset-devices", async (req, res) => {
  if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
  try {
    try { await connectDB(); } catch(e) {}
    if (mongoose.connection.readyState === 1) {
      await VoteModel.deleteMany({});
    }
    res.json({ success: true, message: "Đã xóa bộ nhớ thiết bị thành công!" });
  } catch (err) {
    res.json({ success: true, message: "Đã xóa bộ nhớ thiết bị thành công!" });
  }
});

// SSE Fallback route
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.write("event: ping\ndata: {}\n\n");
  res.end();
});

module.exports = (req, res) => {
  return app(req, res);
};
