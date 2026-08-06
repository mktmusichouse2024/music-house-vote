import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import { createServer as createViteServer } from "vite";

interface Teacher {
  id: string;
  name: string;
  subject: string;
  category: string;
  avatar: string;
  votesCount: number;
  viewsCount?: number;
  bio: string;
}

interface VoteLog {
  id: string;
  userEmail: string;
  userName: string;
  teacherId: string;
  teacherName: string;
  ip: string;
  deviceId?: string;
  timestamp: string;
}

interface AppConfig {
  votingEnabled: boolean;
  countdownEnd?: string | null;
  logoUrl: string;
  programName: string;
  programSubtitle: string;
  programDescription: string;
  maxVotesPerCategory: number;
  maxVotesPerDevice: number;
  pageTitle: string;
  hideResults: boolean;
  candidateTerm?: string;
  subjectTerm?: string;
  bgMusicUrl?: string;
  voteSoundUrl?: string;
}

// Mongoose Schemas
const teacherSchema = new mongoose.Schema<Teacher>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  category: { type: String, required: true },
  avatar: { type: String, required: true },
  votesCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  bio: { type: String, default: "" },
  youtubeUrl: { type: String, default: "" }
});

const voteLogSchema = new mongoose.Schema<VoteLog>({
  id: { type: String, required: true, unique: true },
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  teacherId: { type: String, required: true },
  teacherName: { type: String, required: true },
  ip: { type: String, required: true },
  deviceId: { type: String },
  timestamp: { type: String, required: true }
});

const configSchema = new mongoose.Schema<AppConfig>({
  votingEnabled: { type: Boolean, default: true },
  countdownEnd: { type: String, default: null },
  logoUrl: { type: String, default: "/logo.svg" },
  programName: { type: String, default: "Vinh Danh Nhà Giáo" },
  programSubtitle: { type: String, default: "Music House" },
  programDescription: { type: String, default: "Cơ hội để các học viên tri ân những cống hiến thầm lặng và bầu chọn cho người thầy được yêu thích nhất. Hãy cùng tạo ra kết quả công bằng, xứng đáng nhất!" },
  maxVotesPerCategory: { type: Number, default: 2 },
  maxVotesPerDevice: { type: Number, default: 2 },
  pageTitle: { type: String, default: "MUSIC HOUSE VOTE" },
  hideResults: { type: Boolean, default: false },
  candidateTerm: { type: String, default: "Giáo viên" },
  subjectTerm: { type: String, default: "Bộ môn / Thể loại" },
  bgMusicUrl: { type: String, default: "https://assets.mixkit.co/music/preview/mixkit-award-win-fanfare-2022.mp3" },
  voteSoundUrl: { type: String, default: "" }
});

const TeacherModel = mongoose.model("Teacher", teacherSchema);
const VoteModel = mongoose.model("VoteLog", voteLogSchema);
const ConfigModel = mongoose.model("Config", configSchema);

mongoose.set("bufferCommands", false);

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/musichouse";
mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 })
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    initializeDatabase();
  })
  .catch((err) => console.error("❌ MongoDB Connection Warning (App using memory fallback):", err.message));

const DEFAULT_TEACHERS = [
  { id: "t1", name: "Thầy Hoàng Lâm", subject: "Piano Cổ điển & Hiện đại", category: "Giáo viên được yêu thích nhất", avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200", votesCount: 245, viewsCount: 542, bio: "Trưởng bộ môn Piano tại Music House." },
  { id: "t2", name: "Cô Khánh Linh", subject: "Thanh nhạc & Luyện thanh", category: "Giáo viên cống hiến nhất", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200", votesCount: 218, viewsCount: 481, bio: "Với hơn 10 năm cống hiến..." },
  { id: "t3", name: "Thầy Minh Đức", subject: "Guitar Acoustic & Bass", category: "Giáo viên được yêu thích nhất", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200", votesCount: 195, viewsCount: 415, bio: "Nghệ sĩ Guitar nhiệt huyết..." },
  { id: "t4", name: "Cô Thùy Chi", subject: "Violin & Cảm thụ Âm nhạc", category: "Giáo viên cống hiến nhất", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200", votesCount: 182, viewsCount: 392, bio: "Tốt nghiệp xuất sắc..." },
  { id: "t5", name: "Thầy Quốc Bảo", subject: "Trống Jazz & Trống Điện", category: "Giáo viên được yêu thích nhất", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200", votesCount: 164, viewsCount: 318, bio: "Truyền lửa đam mê..." }
];

let totalPageViews = 2248;

let memoryConfig: any = {
  votingEnabled: true,
  countdownEnd: null,
  logoUrl: "/logo.svg",
  programName: "Vinh Danh Nhà Giáo",
  programSubtitle: "Music House",
  programDescription: "Cơ hội để các học viên tri ân những cống hiến thầm lặng và bầu chọn cho người thầy được yêu thích nhất. Hãy cùng tạo ra kết quả công bằng, xứng đáng nhất!",
  maxVotesPerCategory: 2,
  maxVotesPerDevice: 2,
  pageTitle: "MUSIC HOUSE VOTE",
  hideResults: false,
  candidateTerm: "Giáo viên",
  subjectTerm: "Bộ môn / Thể loại",
  bgMusicUrl: "https://assets.mixkit.co/music/preview/mixkit-award-win-fanfare-2022.mp3",
  voteSoundUrl: ""
};

let memoryTeachers: any[] = [...DEFAULT_TEACHERS];
let memoryVotes: any[] = [];

async function getConfig() {
  if (mongoose.connection.readyState !== 1) return memoryConfig;
  try {
    const doc = await ConfigModel.findOne().lean();
    if (doc) {
      memoryConfig = doc;
      return doc;
    }
  } catch (e) {}
  return memoryConfig;
}

async function getTeachers() {
  if (mongoose.connection.readyState !== 1) return memoryTeachers;
  try {
    const docs = await TeacherModel.find().lean();
    if (docs && docs.length > 0) {
      memoryTeachers = docs;
      return docs;
    }
  } catch (e) {}
  return memoryTeachers;
}

async function initializeDatabase() {
  try {
    const configCount = await ConfigModel.countDocuments();
    if (configCount === 0) {
      await ConfigModel.create(memoryConfig);
    }
    const teacherCount = await TeacherModel.countDocuments();
    if (teacherCount === 0) {
      await TeacherModel.insertMany(DEFAULT_TEACHERS);
    }
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

// Cache for rate limits and sessions
const ipRequestTimestamps: Record<string, number[]> = {};
const userSessions = new Map<string, any>();
const otpSessions = new Map<string, { otp: string, expiresAt: number }>();

const STORE_PATH = path.join(process.cwd(), "public/uploads/db_store.json");

function loadLocalStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
      if (data.config) memoryConfig = { ...memoryConfig, ...data.config };
      if (data.teachers && Array.isArray(data.teachers)) memoryTeachers = data.teachers;
      if (data.votes && Array.isArray(data.votes)) memoryVotes = data.votes;
      if (data.sessions && Array.isArray(data.sessions)) {
        data.sessions.forEach(([k, v]: [string, any]) => userSessions.set(k, v));
      }
    }
  } catch (e) {}
}

function saveLocalStore() {
  try {
    const data = {
      config: memoryConfig,
      teachers: memoryTeachers,
      votes: memoryVotes,
      sessions: Array.from(userSessions.entries())
    };
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {}
}

// Initial load from disk
loadLocalStore();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "mktmusichouse2024@gmail.com",
    pass: "dcsi aaso wjyo oyzi"
  }
});

const ADMIN_TOKEN = "admin_token_Phongmktmusichouse_2026";

// Clean up jobs
setInterval(() => {
  const now = Date.now();
  for (const ip in ipRequestTimestamps) {
    ipRequestTimestamps[ip] = ipRequestTimestamps[ip].filter(t => now - t < 60000);
    if (ipRequestTimestamps[ip].length === 0) delete ipRequestTimestamps[ip];
  }
  for (const [token, session] of userSessions.entries()) {
    if (now - session.createdAt > 24 * 60 * 60 * 1000) userSessions.delete(token);
  }
  for (const [email, otpData] of otpSessions.entries()) {
    if (now > otpData.expiresAt) otpSessions.delete(email);
  }
}, 600000);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));
  
  // Serve uploaded files
  const uploadDir = path.join(process.cwd(), "public/uploads");
  const distUploadDir = path.join(process.cwd(), "dist/uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  if (!fs.existsSync(distUploadDir)) {
    fs.mkdirSync(distUploadDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadDir));
  app.use("/uploads", express.static(distUploadDir));
  
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const cleanName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, Date.now() + "-" + cleanName);
    }
  });
  const upload = multer({ storage });

  // SSE Setup
  const clients = new Set<express.Response>();
  app.get("/api/events", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    
    clients.add(res);

    // Broadcast live activeOnline to all connected clients
    broadcastEvent("online", { activeOnline: Math.max(1, clients.size), totalPageViews });

    // Sync immediately
    try {
      const teachers = await getTeachers();
      const configDoc = await getConfig();
      res.write(`event: sync\ndata: ${JSON.stringify({ teachers, config: configDoc, activeOnline: Math.max(1, clients.size), totalPageViews })}\n\n`);
    } catch(err) {
      console.error(err);
    }
    
    req.on("close", () => {
      clients.delete(res);
      broadcastEvent("online", { activeOnline: Math.max(1, clients.size), totalPageViews });
    });
  });

  function broadcastEvent(type: string, payload: any) {
    const message = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of clients) {
      client.write(message);
    }
  }

  // Routes
  app.get("/api/teachers", async (req, res) => {
    try {
      totalPageViews += 1;
      const configDoc = await getConfig();
      const hideResults = configDoc?.hideResults || false;
      
      let teachers = await getTeachers();
      if (hideResults) {
        teachers = teachers.map((t: any) => ({ ...t, votesCount: -1 }));
      }

      res.json({
        teachers,
        votingEnabled: configDoc?.votingEnabled ?? true,
        countdownEnd: configDoc?.countdownEnd ?? null,
        config: configDoc,
        totalPageViews,
        activeOnline: Math.max(1, clients.size)
      });
    } catch(err) {
      res.status(500).json({ success: false, message: "Database Error" });
    }
  });

  app.post("/api/teachers/:id/view", async (req, res) => {
    try {
      totalPageViews += 1;
      const index = memoryTeachers.findIndex(t => t.id === req.params.id);
      let candidateViews = 0;
      if (index !== -1) {
        memoryTeachers[index].viewsCount = (memoryTeachers[index].viewsCount || 0) + 1;
        candidateViews = memoryTeachers[index].viewsCount;
        try {
          await TeacherModel.findOneAndUpdate({ id: req.params.id }, { $inc: { viewsCount: 1 } });
        } catch (e) {}
      }
      broadcastEvent("view", {
        teacherId: req.params.id,
        viewsCount: candidateViews,
        totalPageViews,
        activeOnline: Math.max(1, clients.size)
      });
      res.json({ success: true, totalPageViews, viewsCount: candidateViews });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });

  app.post("/api/vote", async (req, res) => {
    const { teacherId, captchaToken, deviceId, user: bodyUser } = req.body;
    const authHeader = req.headers.authorization;
    let sessionToken = authHeader?.split(" ")[1];
    const clientIp = req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1";

    let user = sessionToken ? userSessions.get(sessionToken) : null;

    // Auto session recovery if server restarted or token expired
    if (!user && (bodyUser?.email || req.body.email)) {
      const email = bodyUser?.email || req.body.email;
      const name = bodyUser?.name || req.body.name || email.split("@")[0];
      user = { email, name, createdAt: Date.now() };
      if (!sessionToken) {
        sessionToken = "session_" + crypto.randomBytes(16).toString("hex");
      }
      userSessions.set(sessionToken, user);
      saveLocalStore();
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
    }

    if (!teacherId || !captchaToken) {
      return res.status(400).json({ success: false, message: "Yêu cầu không hợp lệ." });
    }

    try {
      const config = memoryConfig;
      if (config && !config.votingEnabled) {
        return res.status(400).json({ success: false, message: "Cổng bình chọn hiện đang đóng." });
      }

      const MAX_VOTES_PER_DEVICE = config?.maxVotesPerDevice || 2;
      const MAX_VOTES_PER_CATEGORY = config?.maxVotesPerCategory || 2;

      // Rate limiting
      const now = Date.now();
      if (!ipRequestTimestamps[clientIp]) ipRequestTimestamps[clientIp] = [];
      ipRequestTimestamps[clientIp] = ipRequestTimestamps[clientIp].filter(t => now - t < 60000);
      if (ipRequestTimestamps[clientIp].length >= 5) {
        return res.status(429).json({ success: false, message: "Bạn đã bình chọn quá nhanh (tối đa 5 lượt/phút)." });
      }
      ipRequestTimestamps[clientIp].push(now);

      const teacherIndex = memoryTeachers.findIndex(t => t.id === teacherId);
      if (teacherIndex === -1) {
        return res.status(404).json({ success: false, message: "Không tìm thấy ứng viên này." });
      }
      const teacher = memoryTeachers[teacherIndex];

      // Anti-cheat checks per device in memory (Strict 2-Vote Limit Per Device)
      if (deviceId) {
        const deviceVotes = memoryVotes.filter(v => v.deviceId === deviceId);
        if (deviceVotes.length >= MAX_VOTES_PER_DEVICE) {
          return res.status(400).json({ success: false, message: `Thiết bị này đã sử dụng hết ${MAX_VOTES_PER_DEVICE} lượt bình chọn!` });
        }

        const alreadyVotedTeacherForDevice = deviceVotes.some(v => v.teacherId === teacherId);
        if (alreadyVotedTeacherForDevice) {
          return res.status(400).json({ success: false, message: `Thiết bị này đã bình chọn cho "${teacher.name}" rồi. Vui lòng chọn 1 ứng viên khác cho lượt bình chọn tiếp theo!` });
        }
      }

      // Anti-cheat checks per email in memory
      const userEmailKey = user.email.toLowerCase();
      const userVotes = memoryVotes.filter(v => (v.userEmail || "").toLowerCase() === userEmailKey);
      
      const alreadyVotedForTeacher = userVotes.some(v => v.teacherId === teacherId);
      if (alreadyVotedForTeacher) {
        return res.status(400).json({ success: false, message: `Tài khoản ${user.email} đã bình chọn cho ${teacher.name} rồi. Vui lòng dành lượt bình chọn cho ứng viên khác!` });
      }

      const userVotedTeacherIds = userVotes.map(v => v.teacherId);
      const userVotedTeachers = memoryTeachers.filter(t => userVotedTeacherIds.includes(t.id));
      const userVotesInCategory = userVotedTeachers.filter(t => t.category === teacher.category).length;

      if (userVotesInCategory >= MAX_VOTES_PER_CATEGORY) {
        return res.status(400).json({ success: false, message: `Tài khoản ${user.email} đã sử dụng hết ${MAX_VOTES_PER_CATEGORY} lượt bình chọn cho hạng mục "${teacher.category}".` });
      }

      // Increment in memory
      memoryTeachers[teacherIndex].votesCount = (memoryTeachers[teacherIndex].votesCount || 0) + 1;

      const newVote = {
        id: "v_" + Math.random().toString(36).substring(2, 9),
        userEmail: user.email,
        userName: user.name || "Học sinh ẩn danh",
        teacherId: teacherId,
        teacherName: teacher.name,
        ip: clientIp,
        deviceId: deviceId,
        timestamp: new Date().toISOString()
      };
      memoryVotes.push(newVote);

      // Save to disk store permanently
      saveLocalStore();

      // Async DB persist attempt
      try {
        await TeacherModel.findOneAndUpdate({ id: teacherId }, { $inc: { votesCount: 1 } });
        await VoteModel.create(newVote);
      } catch (dbErr) {}

      broadcastEvent("vote", { 
        teachers: memoryTeachers,
        latestVote: { userName: newVote.userName, teacherName: newVote.teacherName }
      });

      res.json({
        success: true,
        message: `Bình chọn thành công cho ${teacher.name}!`,
        teachers: memoryTeachers
      });
    } catch(err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Lỗi xử lý yêu cầu bình chọn." });
    }
  });

  app.post("/api/auth/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email || !email.toLowerCase().endsWith("@gmail.com")) {
      return res.status(400).json({ success: false, message: "Vui lòng sử dụng địa chỉ email @gmail.com hợp lệ!" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpSessions.set(email.toLowerCase(), { otp, expiresAt });

    try {
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #d97706; text-align: center;">Mã Xác Nhận Bình Chọn</h2>
          <p>Chào bạn,</p>
          <p>Bạn đã yêu cầu mã xác nhận để đăng nhập vào hệ thống bình chọn Music House. Mã của bạn là:</p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; background-color: #f3f4f6; padding: 10px 20px; border-radius: 8px;">${otp}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Mã này sẽ hết hạn trong vòng 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
        </div>
      `;

      const GAS_URL = process.env.MAIL_SCRIPT_URL; 
      if (!GAS_URL) {
        throw new Error("Chưa cấu hình MAIL_SCRIPT_URL");
      }

      const response = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          to: email,
          subject: "Mã Xác Nhận Đăng Nhập",
          html: htmlBody
        })
      });

      if (!response.ok) throw new Error("Lỗi khi gọi Google Script");

      res.json({ success: true, message: "Mã OTP đã được gửi đến email của bạn." });
    } catch (error) {
      console.error("Lỗi gửi email:", error);
      res.status(500).json({ success: false, message: "Không thể gửi email. Vui lòng thử lại sau." });
    }
  });

  app.post("/api/auth/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Thiếu email hoặc OTP." });

    const emailKey = email.toLowerCase();
    const otpData = otpSessions.get(emailKey);

    if (!otpData) return res.status(400).json({ success: false, message: "Mã xác nhận không tồn tại hoặc đã hết hạn." });
    if (Date.now() > otpData.expiresAt) {
      otpSessions.delete(emailKey);
      return res.status(400).json({ success: false, message: "Mã xác nhận đã hết hạn." });
    }
    if (otpData.otp !== otp) return res.status(400).json({ success: false, message: "Mã xác nhận không chính xác." });

    otpSessions.delete(emailKey);

    const sessionToken = "session_" + crypto.randomBytes(16).toString("hex");
    const user = { email: emailKey, name: emailKey.split("@")[0], createdAt: Date.now() };
    userSessions.set(sessionToken, user);

    res.json({ success: true, token: sessionToken, user });
  });

  app.post("/api/admin/auth-google", (req, res) => {
    const authHeader = req.headers.authorization;
    const sessionToken = authHeader?.split(" ")[1];
    
    if (!sessionToken || !userSessions.has(sessionToken)) {
      return res.status(401).json({ success: false, message: "Phiên đăng nhập không hợp lệ." });
    }
    
    const user = userSessions.get(sessionToken);
    if (user.email.toLowerCase() === "mktmusichouse2024@gmail.com") {
      res.json({ success: true, token: ADMIN_TOKEN });
    } else {
      res.status(403).json({ success: false, message: "Email này không có quyền truy cập Admin." });
    }
  });

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (password === "Phongmktmusichouse") {
      res.json({ success: true, token: ADMIN_TOKEN });
    } else {
      res.status(401).json({ success: false, message: "Mật khẩu Admin không chính xác!" });
    }
  });

  app.post("/api/admin/toggle-voting", async (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false, message: "Không có quyền truy cập." });

    try {
      const configDoc = await ConfigModel.findOne();
      if (configDoc) {
        configDoc.votingEnabled = !!req.body.enabled;
        await configDoc.save();
        broadcastEvent("config", configDoc.toObject());
        res.json({ success: true, votingEnabled: configDoc.votingEnabled });
      } else {
        res.status(500).json({ success: false });
      }
    } catch(err) {
      res.status(500).json({ success: false });
    }
  });

  app.post("/api/admin/countdown", async (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });

    try {
      const configDoc = await ConfigModel.findOne();
      if (configDoc) {
        configDoc.countdownEnd = req.body.countdownEnd || null;
        await configDoc.save();
        broadcastEvent("config", configDoc.toObject());
        res.json({ success: true, config: configDoc.toObject() });
      }
    } catch(err) { res.status(500).json({ success: false }); }
  });

  app.post("/api/admin/config", async (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
    
    try {
      const { logoUrl, programName, programSubtitle, programDescription, maxVotesPerCategory, maxVotesPerDevice, pageTitle, hideResults, candidateTerm, subjectTerm, bgMusicUrl, voteSoundUrl } = req.body;
      
      if (logoUrl !== undefined) memoryConfig.logoUrl = logoUrl;
      if (programName !== undefined) memoryConfig.programName = programName;
      if (programSubtitle !== undefined) memoryConfig.programSubtitle = programSubtitle;
      if (programDescription !== undefined) memoryConfig.programDescription = programDescription;
      if (maxVotesPerCategory !== undefined) memoryConfig.maxVotesPerCategory = Number(maxVotesPerCategory);
      if (maxVotesPerDevice !== undefined) memoryConfig.maxVotesPerDevice = Number(maxVotesPerDevice);
      if (pageTitle !== undefined) memoryConfig.pageTitle = pageTitle;
      if (hideResults !== undefined) memoryConfig.hideResults = hideResults;
      if (candidateTerm !== undefined) memoryConfig.candidateTerm = candidateTerm;
      if (subjectTerm !== undefined) memoryConfig.subjectTerm = subjectTerm;
      if (bgMusicUrl !== undefined) memoryConfig.bgMusicUrl = bgMusicUrl;
      if (voteSoundUrl !== undefined) memoryConfig.voteSoundUrl = voteSoundUrl;

      saveLocalStore();

      try {
        await ConfigModel.findOneAndUpdate({}, { $set: memoryConfig }, { upsert: true, new: true });
      } catch (dbErr) {}

      broadcastEvent("config", memoryConfig);
      res.json({ success: true, config: memoryConfig });
    } catch(err) { res.status(500).json({ success: false }); }
  });

  app.post("/api/admin/upload", upload.single("image"), (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
    if (!req.file) return res.status(400).json({ success: false });

    try {
      const distPath = path.join(process.cwd(), "dist/uploads", req.file.filename);
      fs.copyFileSync(req.file.path, distPath);
    } catch (e) {}

    res.json({ success: true, url: `/uploads/${req.file.filename}` });
  });

  app.post("/api/admin/upload-audio", upload.single("audio"), (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
    if (!req.file) return res.status(400).json({ success: false, message: "Vui lòng chọn file âm thanh." });

    try {
      const distPath = path.join(process.cwd(), "dist/uploads", req.file.filename);
      fs.copyFileSync(req.file.path, distPath);
    } catch (e) {}

    res.json({ success: true, url: `/uploads/${req.file.filename}` });
  });

  app.post("/api/admin/teachers", async (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
    const { name, subject, category, avatar, bio, youtubeUrl } = req.body;
    try {
      const newTeacher = {
        id: "t_" + Math.random().toString(36).substring(2, 9),
        name,
        subject,
        category,
        avatar: avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
        votesCount: 0,
        bio: bio || "",
        youtubeUrl: youtubeUrl || ""
      };
      memoryTeachers.push(newTeacher);

      try {
        await TeacherModel.create(newTeacher);
      } catch (dbErr) {}

      broadcastEvent("sync", { teachers: memoryTeachers, config: memoryConfig });
      res.json({ success: true, teachers: memoryTeachers });
    } catch(err) { res.status(500).json({ success: false }); }
  });

  app.put("/api/admin/teachers/:id", async (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
    try {
      const index = memoryTeachers.findIndex(t => t.id === req.params.id);
      if (index !== -1) {
        ["name", "subject", "category", "avatar", "bio", "youtubeUrl"].forEach(key => {
          if (req.body[key] !== undefined) memoryTeachers[index][key] = req.body[key];
        });
      }

      try {
        const updateData: any = {};
        ["name", "subject", "category", "avatar", "bio", "youtubeUrl"].forEach(key => {
          if (req.body[key] !== undefined) updateData[key] = req.body[key];
        });
        await TeacherModel.findOneAndUpdate({ id: req.params.id }, updateData);
      } catch (dbErr) {}

      broadcastEvent("sync", { teachers: memoryTeachers, config: memoryConfig });
      res.json({ success: true, teachers: memoryTeachers });
    } catch(err) { res.status(500).json({ success: false }); }
  });

  app.delete("/api/admin/teachers/:id", async (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
    try {
      memoryTeachers = memoryTeachers.filter(t => t.id !== req.params.id);

      try {
        await TeacherModel.findOneAndDelete({ id: req.params.id });
      } catch (dbErr) {}

      broadcastEvent("sync", { teachers: memoryTeachers, config: memoryConfig });
      res.json({ success: true, teachers: memoryTeachers });
    } catch(err) { res.status(500).json({ success: false }); }
  });

  app.get("/api/admin/votes/history", async (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
    try {
      let votes = memoryVotes;
      try {
        const dbVotes = await VoteModel.find().lean();
        if (dbVotes && dbVotes.length > 0) votes = dbVotes;
      } catch (dbErr) {}

      res.json({ success: true, votes, config: memoryConfig });
    } catch(err) { res.status(500).json({ success: false }); }
  });

  app.get("/api/admin/export", async (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
    try {
      let votes = memoryVotes;
      try {
        const dbVotes = await VoteModel.find().lean();
        if (dbVotes && dbVotes.length > 0) votes = dbVotes;
      } catch (dbErr) {}

      const csvRows = [
        ["ID", "Nguoi_Binh_Chon", "Email", "Binh_Chon_Cho", "IP", "Thoi_Gian"]
      ];
      
      votes.forEach((vote: any) => {
        csvRows.push([
          vote.id,
          `"${vote.userName || ''}"`,
          `"${vote.userEmail || ''}"`,
          `"${vote.teacherName || ''}"`,
          `"${vote.ip || ''}"`,
          `"${new Date(vote.timestamp).toLocaleString('vi-VN')}"`
        ]);
      });
      
      const csvContent = "\uFEFF" + csvRows.map(e => e.join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=Lich_su_binh_chon.csv");
      res.send(csvContent);
    } catch (err) {
      res.status(500).json({ success: false, message: "Export error" });
    }
  });

  app.post("/api/admin/reset-devices", async (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
    try {
      memoryVotes = [];
      try {
        await VoteModel.deleteMany({});
      } catch (dbErr) {}

      broadcastEvent("reset_devices", { timestamp: Date.now() });
      saveLocalStore();
      res.json({ success: true, message: "Đã xóa bộ nhớ thiết bị thành công! Tất cả thiết bị có thể tiếp tục bình chọn." });
    } catch(err) { res.status(500).json({ success: false }); }
  });

  app.post("/api/admin/reset", async (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
    try {
      memoryTeachers = memoryTeachers.map(t => ({ ...t, votesCount: 0 }));
      memoryVotes = [];

      try {
        await VoteModel.deleteMany({});
        await TeacherModel.updateMany({}, { votesCount: 0 });
      } catch (dbErr) {}

      broadcastEvent("reset_devices", { timestamp: Date.now() });
      broadcastEvent("sync", { teachers: memoryTeachers, config: memoryConfig });
      res.json({ success: true, teachers: memoryTeachers });
    } catch(err) { res.status(500).json({ success: false }); }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
