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
  logoUrl?: string;
  programName?: string;
  programSubtitle?: string;
  programDescription?: string;
}

// Mongoose Schemas
const teacherSchema = new mongoose.Schema<Teacher>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  category: { type: String, required: true },
  avatar: { type: String, required: true },
  votesCount: { type: Number, default: 0 },
  bio: { type: String, default: "" }
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
  programDescription: { type: String, default: "Cơ hội để các học viên tri ân những cống hiến thầm lặng và bầu chọn cho người thầy được yêu thích nhất. Hãy cùng tạo ra kết quả công bằng, xứng đáng nhất!" }
});

const TeacherModel = mongoose.model("Teacher", teacherSchema);
const VoteModel = mongoose.model("VoteLog", voteLogSchema);
const ConfigModel = mongoose.model("Config", configSchema);

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/musichouse";
mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

const DEFAULT_TEACHERS = [
  { id: "t1", name: "Thầy Hoàng Lâm", subject: "Piano Cổ điển & Hiện đại", category: "Giáo viên được yêu thích nhất", avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200", votesCount: 245, bio: "Trưởng bộ môn Piano tại Music House." },
  { id: "t2", name: "Cô Khánh Linh", subject: "Thanh nhạc & Luyện thanh", category: "Giáo viên cống hiến nhất", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200", votesCount: 218, bio: "Với hơn 10 năm cống hiến..." },
  { id: "t3", name: "Thầy Minh Đức", subject: "Guitar Acoustic & Bass", category: "Giáo viên được yêu thích nhất", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200", votesCount: 195, bio: "Nghệ sĩ Guitar nhiệt huyết..." },
  { id: "t4", name: "Cô Thùy Chi", subject: "Violin & Cảm thụ Âm nhạc", category: "Giáo viên cống hiến nhất", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200", votesCount: 182, bio: "Tốt nghiệp xuất sắc..." },
  { id: "t5", name: "Thầy Quốc Bảo", subject: "Trống Jazz & Trống Điện", category: "Giáo viên được yêu thích nhất", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200", votesCount: 164, bio: "Truyền lửa đam mê..." }
];

async function initializeDatabase() {
  try {
    const configCount = await ConfigModel.countDocuments();
    if (configCount === 0) {
      await ConfigModel.create({});
    }
    const teacherCount = await TeacherModel.countDocuments();
    if (teacherCount === 0) {
      await TeacherModel.insertMany(DEFAULT_TEACHERS);
    }
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

mongoose.connection.once("open", () => {
  initializeDatabase();
});

// Cache for rate limits and sessions
const ipRequestTimestamps: Record<string, number[]> = {};
const userSessions = new Map<string, any>();
const otpSessions = new Map<string, { otp: string, expiresAt: number }>();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "mktmusichouse2024@gmail.com",
    pass: "dcsi aaso wjyo oyzi"
  }
});

const ADMIN_TOKEN = "admin_" + crypto.randomBytes(16).toString("hex");

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

  app.use(express.json());
  
  // Serve uploaded files
  const uploadDir = path.join(process.cwd(), "public/uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadDir));
  
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
  });
  const upload = multer({ storage });

  // SSE Setup
  const clients = new Set<express.Response>();
  app.get("/api/events", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    
    // Sync immediately
    try {
      const teachers = await TeacherModel.find().lean();
      const configDoc = await ConfigModel.findOne().lean();
      res.write(`event: sync\ndata: ${JSON.stringify({ teachers, config: configDoc })}\n\n`);
    } catch(err) {
      console.error(err);
    }
    
    clients.add(res);
    req.on("close", () => clients.delete(res));
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
      const teachers = await TeacherModel.find().lean();
      const configDoc = await ConfigModel.findOne().lean();
      res.json({
        teachers,
        votingEnabled: configDoc?.votingEnabled ?? true,
        countdownEnd: configDoc?.countdownEnd ?? null
      });
    } catch(err) {
      res.status(500).json({ success: false, message: "Database Error" });
    }
  });

  app.post("/api/vote", async (req, res) => {
    const { teacherId, captchaToken, deviceId } = req.body;
    const authHeader = req.headers.authorization;
    const sessionToken = authHeader?.split(" ")[1];
    const clientIp = req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1";

    if (!sessionToken || !userSessions.has(sessionToken)) {
      return res.status(401).json({ success: false, message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
    }
    const user = userSessions.get(sessionToken);

    if (!teacherId || !captchaToken) {
      return res.status(400).json({ success: false, message: "Yêu cầu không hợp lệ." });
    }

    try {
      const configDoc = await ConfigModel.findOne().lean();
      if (configDoc && !configDoc.votingEnabled) {
        return res.status(400).json({ success: false, message: "Cổng bình chọn hiện đang đóng." });
      }

      // Rate limiting
      const now = Date.now();
      if (!ipRequestTimestamps[clientIp]) ipRequestTimestamps[clientIp] = [];
      ipRequestTimestamps[clientIp] = ipRequestTimestamps[clientIp].filter(t => now - t < 60000);
      if (ipRequestTimestamps[clientIp].length >= 5) {
        return res.status(429).json({ success: false, message: "Bạn đã bình chọn quá nhanh (tối đa 5 lượt/phút)." });
      }
      ipRequestTimestamps[clientIp].push(now);

      // Anti-cheat checks
      if (deviceId) {
        const deviceVotes = await VoteModel.countDocuments({ deviceId });
        if (deviceVotes >= 2) {
          return res.status(400).json({ success: false, message: "Thiết bị này đã sử dụng hết 2 lượt bình chọn." });
        }
      }

      const userEmailKey = user.email.toLowerCase();
      const userVotes = await VoteModel.find({ userEmail: new RegExp(`^${userEmailKey}$`, 'i') });
      
      const alreadyVotedForTeacher = userVotes.some(v => v.teacherId === teacherId);
      if (alreadyVotedForTeacher) {
        const votedTeacher = await TeacherModel.findOne({ id: teacherId }).lean();
        const votedName = votedTeacher ? votedTeacher.name : "giáo viên này";
        return res.status(400).json({ success: false, message: `Tài khoản ${user.email} đã bình chọn cho ${votedName} rồi. Vui lòng dành lượt bình chọn thứ 2 cho ứng viên khác!` });
      }

      if (userVotes.length >= 2) {
        return res.status(400).json({ success: false, message: `Tài khoản ${user.email} đã sử dụng hết 2 lượt bình chọn.` });
      }

      const teacher = await TeacherModel.findOne({ id: teacherId });
      if (!teacher) {
        return res.status(404).json({ success: false, message: "Không tìm thấy giáo viên này." });
      }

      teacher.votesCount += 1;
      await teacher.save();

      const newVote = await VoteModel.create({
        id: "v_" + Math.random().toString(36).substring(2, 9),
        userEmail: user.email,
        userName: user.name || "Học sinh ẩn danh",
        teacherId: teacherId,
        teacherName: teacher.name,
        ip: clientIp,
        deviceId: deviceId,
        timestamp: new Date().toISOString()
      });

      const updatedTeachers = await TeacherModel.find().lean();
      
      broadcastEvent("vote", { 
        teachers: updatedTeachers,
        latestVote: { userName: newVote.userName, teacherName: newVote.teacherName }
      });

      res.json({
        success: true,
        message: `Bình chọn thành công cho ${teacher.name}!`,
        teachers: updatedTeachers
      });
    } catch(err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Lỗi hệ thống CSDL." });
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
      await transporter.sendMail({
        from: '"Hệ Thống Bình Chọn Music House" <mktmusichouse2024@gmail.com>',
        to: email,
        subject: "Mã Xác Nhận Đăng Nhập",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #d97706; text-align: center;">Mã Xác Nhận Bình Chọn</h2>
            <p>Chào bạn,</p>
            <p>Bạn đã yêu cầu mã xác nhận để đăng nhập vào hệ thống bình chọn Music House. Mã của bạn là:</p>
            <div style="text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; background-color: #f3f4f6; padding: 10px 20px; border-radius: 8px;">${otp}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Mã này sẽ hết hạn trong vòng 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
          </div>
        `
      });
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
      const configDoc = await ConfigModel.findOne();
      if (configDoc) {
        const { logoUrl, programName, programSubtitle, programDescription } = req.body;
        if (logoUrl !== undefined) configDoc.logoUrl = logoUrl;
        if (programName !== undefined) configDoc.programName = programName;
        if (programSubtitle !== undefined) configDoc.programSubtitle = programSubtitle;
        if (programDescription !== undefined) configDoc.programDescription = programDescription;
        await configDoc.save();
        broadcastEvent("config", configDoc.toObject());
        res.json({ success: true, config: configDoc.toObject() });
      }
    } catch(err) { res.status(500).json({ success: false }); }
  });

  app.post("/api/admin/upload", upload.single("image"), (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
    if (!req.file) return res.status(400).json({ success: false });
    res.json({ success: true, url: `/uploads/${req.file.filename}` });
  });

  app.post("/api/admin/teachers", async (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
    const { name, subject, category, avatar, bio } = req.body;
    try {
      await TeacherModel.create({
        id: "t_" + Math.random().toString(36).substring(2, 9),
        name, subject, category,
        avatar: avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
        bio: bio || ""
      });
      const teachers = await TeacherModel.find().lean();
      const configDoc = await ConfigModel.findOne().lean();
      broadcastEvent("sync", { teachers, config: configDoc });
      res.json({ success: true, teachers });
    } catch(err) { res.status(500).json({ success: false }); }
  });

  app.put("/api/admin/teachers/:id", async (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
    try {
      const updateData: any = {};
      ["name", "subject", "category", "avatar", "bio"].forEach(key => {
        if (req.body[key] !== undefined) updateData[key] = req.body[key];
      });
      await TeacherModel.findOneAndUpdate({ id: req.params.id }, updateData);
      const teachers = await TeacherModel.find().lean();
      const configDoc = await ConfigModel.findOne().lean();
      broadcastEvent("sync", { teachers, config: configDoc });
      res.json({ success: true, teachers });
    } catch(err) { res.status(500).json({ success: false }); }
  });

  app.delete("/api/admin/teachers/:id", async (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
    try {
      await TeacherModel.findOneAndDelete({ id: req.params.id });
      const teachers = await TeacherModel.find().lean();
      const configDoc = await ConfigModel.findOne().lean();
      broadcastEvent("sync", { teachers, config: configDoc });
      res.json({ success: true, teachers });
    } catch(err) { res.status(500).json({ success: false }); }
  });

  app.get("/api/admin/votes/history", async (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
    try {
      const votes = await VoteModel.find().lean();
      res.json({ success: true, votes });
    } catch(err) { res.status(500).json({ success: false }); }
  });

  app.post("/api/admin/reset", async (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(403).json({ success: false });
    try {
      await VoteModel.deleteMany({});
      await TeacherModel.updateMany({}, { votesCount: 0 });
      const teachers = await TeacherModel.find().lean();
      const configDoc = await ConfigModel.findOne().lean();
      broadcastEvent("sync", { teachers, config: configDoc });
      res.json({ success: true, teachers });
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
