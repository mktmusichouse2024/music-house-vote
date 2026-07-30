import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Teacher, VoteLog, User } from "../types";
import { 
  Lock, Settings, Plus, Edit, Trash2, ToggleLeft, ToggleRight, 
  RotateCcw, LogOut, Check, Eye, EyeOff, Search, FileSpreadsheet, X, Calendar, Server, Upload
} from "lucide-react";

interface AdminPanelProps {
  teachers: Teacher[];
  votingEnabled: boolean;
  onRefreshData: () => void;
  onClose: () => void;
  currentUser?: User | null;
  sessionToken?: string;
  appConfig?: {
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
  };
}

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200"
];

export default function AdminPanel({ teachers, votingEnabled, appConfig, onRefreshData, onClose, currentUser, sessionToken }: AdminPanelProps) {
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authToken, setAuthToken] = useState("");

  // Menu tabs: "teachers", "logs", "config"
  const [activeTab, setActiveTab] = useState<"teachers" | "logs" | "config">("teachers");
  
  // Teachers state & Form
  const [showForm, setShowForm] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formCategory, setFormCategory] = useState("Giáo viên được yêu thích nhất");
  const [formBio, setFormBio] = useState("");
  const [formAvatar, setFormAvatar] = useState("");
  const [formYoutubeUrl, setFormYoutubeUrl] = useState("");
  const [formError, setFormError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [countdownInput, setCountdownInput] = useState("");

  // Branding & Config state
  const [formLogoUrl, setFormLogoUrl] = useState(appConfig?.logoUrl || "/logo.svg");
  const [formProgramName, setFormProgramName] = useState(appConfig?.programName || "Vinh Danh Nhà Giáo");
  const [formProgramSubtitle, setFormProgramSubtitle] = useState(appConfig?.programSubtitle || "Music House");
  const [formProgramDescription, setFormProgramDescription] = useState(appConfig?.programDescription || "Cơ hội để các học viên tri ân những cống hiến thầm lặng và bầu chọn cho người thầy được yêu thích nhất. Hãy cùng tạo ra kết quả công bằng, xứng đáng nhất!");
  
  const [formMaxVotesCat, setFormMaxVotesCat] = useState(appConfig?.maxVotesPerCategory?.toString() || "2");
  const [formMaxVotesDev, setFormMaxVotesDev] = useState(appConfig?.maxVotesPerDevice?.toString() || "2");
  const [formPageTitle, setFormPageTitle] = useState(appConfig?.pageTitle || "MUSIC HOUSE VOTE");
  const [formHideResults, setFormHideResults] = useState(appConfig?.hideResults || false);
  const [formCandidateTerm, setFormCandidateTerm] = useState(appConfig?.candidateTerm || "Giáo viên");
  const [formSubjectTerm, setFormSubjectTerm] = useState(appConfig?.subjectTerm || "Bộ môn / Thể loại");
  const [formBgMusicUrl, setFormBgMusicUrl] = useState(appConfig?.bgMusicUrl || "https://assets.mixkit.co/music/preview/mixkit-award-win-fanfare-2022.mp3");
  const [formVoteSoundUrl, setFormVoteSoundUrl] = useState(appConfig?.voteSoundUrl || "");
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  const handleUploadAudioFile = async (e: React.ChangeEvent<HTMLInputElement>, targetField: "bgMusic" | "voteSound") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("audio", file);

    setIsUploadingAudio(true);
    try {
      const response = await fetch("/api/admin/upload-audio", {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        const payload: any = {};
        if (targetField === "bgMusic") {
          setFormBgMusicUrl(data.url);
          payload.bgMusicUrl = data.url;
        } else {
          setFormVoteSoundUrl(data.url);
          payload.voteSoundUrl = data.url;
        }
        
        // Auto-save immediately to server & disk so F5 never reverts to old music
        await fetch("/api/admin/config", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}` 
          },
          body: JSON.stringify(payload)
        });
        onRefreshData();
        alert("Đã tải file âm thanh lên và TỰ ĐỘNG LƯU VĨNH VIỄN thành công!");
      } else {
        alert(data.message || "Lỗi khi tải file âm thanh.");
      }
    } catch (err) {
      alert("Lỗi kết nối khi tải âm thanh.");
    } finally {
      setIsUploadingAudio(false);
    }
  };

  // Logs state
  const [voteLogs, setVoteLogs] = useState<VoteLog[]>([]);
  const [logsSearch, setLogsSearch] = useState("");



  // Sync form state when appConfig prop changes
  useEffect(() => {
    if (appConfig) {
      if (appConfig.candidateTerm) setFormCandidateTerm(appConfig.candidateTerm);
      if (appConfig.subjectTerm) setFormSubjectTerm(appConfig.subjectTerm);
      if (appConfig.logoUrl) setFormLogoUrl(appConfig.logoUrl);
      if (appConfig.programName) setFormProgramName(appConfig.programName);
      if (appConfig.programSubtitle) setFormProgramSubtitle(appConfig.programSubtitle);
      if (appConfig.programDescription) setFormProgramDescription(appConfig.programDescription);
      if (appConfig.pageTitle) setFormPageTitle(appConfig.pageTitle);
      if (appConfig.maxVotesPerCategory) setFormMaxVotesCat(appConfig.maxVotesPerCategory.toString());
      if (appConfig.maxVotesPerDevice) setFormMaxVotesDev(appConfig.maxVotesPerDevice.toString());
      if (appConfig.hideResults !== undefined) setFormHideResults(appConfig.hideResults);
      if (appConfig.bgMusicUrl) setFormBgMusicUrl(appConfig.bgMusicUrl);
      if (appConfig.voteSoundUrl) setFormVoteSoundUrl(appConfig.voteSoundUrl);
    }
  }, [appConfig]);

  // Load logs & config when authorized
  useEffect(() => {
    if (isAuthorized) {
      fetchVoteLogs();
    }
  }, [isAuthorized]);

  const fetchVoteLogs = async () => {
    if (!authToken) return;
    try {
      const response = await fetch("/api/admin/votes/history", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }
      const data = await response.json();
      if (data.success) setVoteLogs(data.votes);
      if (data.config && data.config.countdownEnd) {
        // Format to YYYY-MM-DDTHH:mm for the input
        const date = new Date(data.config.countdownEnd);
        const isoString = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setCountdownInput(isoString);
      }
      if (data.config) {
        setFormLogoUrl(data.config.logoUrl || "/logo.svg");
        setFormProgramName(data.config.programName || "Vinh Danh Nhà Giáo");
        setFormProgramSubtitle(data.config.programSubtitle || "Music House");
        setFormProgramDescription(data.config.programDescription || "Cơ hội để các học viên tri ân những cống hiến thầm lặng và bầu chọn cho người thầy được yêu thích nhất. Hãy cùng tạo ra kết quả công bằng, xứng đáng nhất!");
        setFormMaxVotesCat(data.config.maxVotesPerCategory?.toString() || "2");
        setFormMaxVotesDev(data.config.maxVotesPerDevice?.toString() || "2");
        setFormPageTitle(data.config.pageTitle || "MUSIC HOUSE VOTE");
        setFormHideResults(data.config.hideResults || false);
        setFormCandidateTerm(data.config.candidateTerm || "Giáo viên");
        setFormSubjectTerm(data.config.subjectTerm || "Bộ môn / Thể loại");
      }
    } catch (err) {
      console.error("Error fetching logs", err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await response.json();
      if (data.success) {
        setAuthToken(data.token);
        setIsAuthorized(true);
        setPassword("");
      } else {
        setAuthError(data.message || "Mật khẩu PIN Admin không chính xác.");
      }
    } catch (err) {
      setAuthError("Lỗi kết nối server.");
    }
  };

  const handleLogout = () => {
    setAuthToken("");
    setIsAuthorized(false);
  };

  const handleToggleVoting = async () => {
    try {
      const response = await fetch("/api/admin/toggle-voting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ enabled: !votingEnabled })
      });
      const data = await response.json();
      if (data.success) {
        onRefreshData();
      }
    } catch (err) {
      console.error("Error toggling portal", err);
    }
  };

  const handleResetVotes = async () => {
    if (!window.confirm("BẠN CÓ CHẮC CHẮN MUỐN RESET TOÀN BỘ SỐ LƯỢT VOTE VỀ 0? Hành động này không thể hoàn tác!")) {
      return;
    }
    try {
      const response = await fetch("/api/admin/reset", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        onRefreshData();
        fetchVoteLogs();
        alert("Đã reset toàn bộ lượt bình chọn thành công!");
      }
    } catch (err) {
      console.error("Error resetting", err);
    }
  };

  const handleSaveCountdown = async () => {
    try {
      const response = await fetch("/api/admin/countdown", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ countdownEnd: countdownInput || null })
      });
      const data = await response.json();
      if (data.success) {
        alert("Đã lưu thời gian kết thúc bình chọn!");
        onRefreshData(); // Trigger reload to update countdown on main screen
      }
    } catch (err) {
      console.error("Error setting countdown", err);
    }
  };

  const handleAddTeacherClick = () => {
    setEditingTeacherId(null);
    setFormName("");
    setFormSubject("");
    setFormCategory("Giáo viên được yêu thích nhất");
    setFormBio("");
    setFormAvatar(PRESET_AVATARS[0]);
    setFormYoutubeUrl("");
    setFormError("");
    setShowForm(true);
  };

  const handleEditTeacherClick = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id);
    setFormName(teacher.name);
    setFormSubject(teacher.subject);
    setFormCategory(teacher.category);
    setFormBio(teacher.bio || "");
    setFormAvatar(teacher.avatar);
    setFormYoutubeUrl(teacher.youtubeUrl || "");
    setFormError("");
    setShowForm(true);
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    if (!window.confirm(`Xóa hồ sơ ${formCandidateTerm || "ứng viên"} "${name}"? Thao tác này sẽ xóa vĩnh viễn khỏi danh sách!`)) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/teachers/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        onRefreshData();
        fetchVoteLogs();
      }
    } catch (err) {
      console.error("Error deleting", err);
    }
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setIsUploading(true);
    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` },
        body: formData
      });
      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }
      const data = await response.json();
      if (data.success) {
        setFormAvatar(data.url);
      } else {
        setFormError(data.message || "Lỗi upload ảnh.");
      }
    } catch (error) {
      setFormError("Lỗi kết nối khi upload ảnh.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setIsUploadingLogo(true);
    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` },
        body: formData
      });
      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }
      const data = await response.json();
      if (data.success) {
        setFormLogoUrl(data.url);
      } else {
        alert(data.message || "Lỗi upload ảnh.");
      }
    } catch (error) {
      alert("Lỗi kết nối khi upload ảnh.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveBranding = async () => {
    try {
      const response = await fetch("/api/admin/config", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          logoUrl: formLogoUrl,
          programName: formProgramName,
          programSubtitle: formProgramSubtitle,
          programDescription: formProgramDescription,
          maxVotesPerCategory: formMaxVotesCat,
          maxVotesPerDevice: formMaxVotesDev,
          pageTitle: formPageTitle,
          hideResults: formHideResults,
          candidateTerm: formCandidateTerm,
          subjectTerm: formSubjectTerm,
          bgMusicUrl: formBgMusicUrl,
          voteSoundUrl: formVoteSoundUrl
        })
      });
      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }
      const data = await response.json();
      if (data.success) {
        onRefreshData();
        alert(`Đã lưu thiết lập hệ thống! Danh xưng đã đổi thành: "${formCandidateTerm || "Ứng viên"}"`);
      }
    } catch (error) {
      alert("Lỗi khi lưu cấu hình thương hiệu.");
    }
  };

  const handleSubmitTeacherForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formName.trim() || !formSubject.trim() || !formCategory.trim()) {
      setFormError("Vui lòng nhập đầy đủ thông tin bắt buộc.");
      return;
    }

    const payload = {
      name: formName.trim(),
      subject: formSubject.trim(),
      category: formCategory.trim(),
      avatar: formAvatar.trim() || PRESET_AVATARS[0],
      bio: formBio.trim(),
      youtubeUrl: formYoutubeUrl.trim()
    };

    try {
      const url = editingTeacherId 
        ? `/api/admin/teachers/${editingTeacherId}` 
        : "/api/admin/teachers";
      const method = editingTeacherId ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        onRefreshData();
        setShowForm(false);
      } else {
        setFormError(data.message || "Lỗi xử lý yêu cầu.");
      }
    } catch (err) {
      setFormError("Không thể kết nối máy chủ.");
    }
  };

  // Filter logs
  const filteredLogs = voteLogs.filter(log => {
    const searchLower = logsSearch.toLowerCase();
    return (
      log.userEmail.toLowerCase().includes(searchLower) ||
      log.userName.toLowerCase().includes(searchLower) ||
      log.teacherName.toLowerCase().includes(searchLower) ||
      log.ip.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        id="admin-backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
      />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="relative w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-gold-500/20 bg-[#08080a] shadow-[0_20px_50px_rgba(0,0,0,0.9)] text-[#f3f4f6] font-sans"
      >
        {/* Glow element */}
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-gold-500/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-bronze/5 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="p-5 border-b border-white/[0.04] flex justify-between items-center bg-[#050507] relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold-500/5 rounded-lg text-gold-400 border border-gold-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display tracking-tight text-white flex items-center gap-2">
                Hệ Thống Quản Trị
                <span className="px-1.5 py-0.5 text-[9px] font-mono tracking-widest text-gold-400 bg-gold-500/10 rounded border border-gold-500/25 uppercase">Admin Portal</span>
              </h1>
              <p className="text-xs text-[#C5A880]/80 font-sans font-light">Kiểm soát danh sách, cấu hình, lịch sử bình chọn thực tế.</p>
            </div>
          </div>
          <button
            id="close-admin-panel-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-gold-400/60 hover:text-gold-400 bg-white/[0.03] hover:bg-white/[0.08] rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Auth Barrier if not Authorized */}
        {!isAuthorized ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-black/40">
            <div className="max-w-sm w-full bg-[#0c0c0e] p-6 rounded-2xl border border-gold-500/15 shadow-inner">
              <div className="w-12 h-12 bg-gold-500/5 border border-gold-500/20 text-gold-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-md font-bold text-[#E5D5B5] mb-1 font-display">Mở khóa bảng điều khiển</h3>
              <p className="text-xs text-slate-400 mb-5 font-sans font-light">
                Vui lòng nhập mật khẩu PIN Admin để mở khóa bảng điều khiển Quản trị.
              </p>
              
              <div className="space-y-4">
                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="relative">
                    <input
                      id="admin-password-input"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Mật khẩu Admin"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 text-sm bg-black border border-gold-500/15 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-gold-500 transition-all font-mono"
                    />
                    <button
                      id="toggle-admin-password-btn"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C5A880]/60 hover:text-gold-400 focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {authError && <p className="text-xs text-rose-500 font-semibold">{authError}</p>}

                  <button
                    id="admin-login-submit-btn"
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-gold-600 via-gold-500 to-bronze text-slate-950 text-sm font-bold rounded-lg hover:from-gold-500 hover:to-gold-400 transition-all shadow-lg hover:shadow-gold-500/10 cursor-pointer"
                  >
                    Xác thực PIN Admin
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          /* Authorized Panel Content */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-black/20">
            {/* Navigation */}
            <div className="w-full md:w-48 bg-[#050507]/60 border-b md:border-b-0 md:border-r border-white/[0.04] p-2 md:p-4 flex flex-row md:flex-col justify-between items-center md:items-stretch gap-2 shrink-0 overflow-x-auto hide-scrollbar">
              <div className="flex flex-row md:flex-col gap-1 sm:gap-2">
                <button
                  id="admin-tab-teachers-btn"
                  type="button"
                  onClick={() => setActiveTab("teachers")}
                  className={`flex-none md:w-full flex items-center gap-1.5 md:gap-2 px-3 py-2 text-[11px] md:text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "teachers"
                      ? "bg-gradient-to-r from-gold-950/40 to-bronze/10 text-gold-400 shadow-md border border-gold-500/30"
                      : "text-slate-400 hover:text-gold-300 hover:bg-gold-500/5"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Hồ sơ {formCandidateTerm || "Ứng viên"}
                </button>

                <button
                  id="admin-tab-logs-btn"
                  type="button"
                  onClick={() => setActiveTab("logs")}
                  className={`flex-none md:w-full flex items-center gap-1.5 md:gap-2 px-3 py-2 text-[11px] md:text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "logs"
                      ? "bg-gradient-to-r from-gold-950/40 to-bronze/10 text-gold-400 shadow-md border border-gold-500/30"
                      : "text-slate-400 hover:text-gold-300 hover:bg-gold-500/5"
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Nhật ký bình chọn
                </button>

                <button
                  id="admin-tab-config-btn"
                  type="button"
                  onClick={() => setActiveTab("config")}
                  className={`flex-none md:w-full flex items-center gap-1.5 md:gap-2 px-3 py-2 text-[11px] md:text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "config"
                      ? "bg-gradient-to-r from-gold-950/40 to-bronze/10 text-gold-400 shadow-md border border-gold-500/30"
                      : "text-slate-400 hover:text-gold-300 hover:bg-gold-500/5"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Cấu hình hệ thống
                </button>
              </div>

              <button
                id="admin-logout-btn"
                type="button"
                onClick={handleLogout}
                className="flex-none md:w-full flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2 text-[11px] md:text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-lg transition-all border border-transparent hover:border-rose-500/20 cursor-pointer whitespace-nowrap ml-2 md:ml-0 md:mt-2"
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất Admin
              </button>
            </div>

            {/* Display tab sheets */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 relative">
              
              {/* TAB 1: TEACHERS LIST */}
              {activeTab === "teachers" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h3 className="text-sm font-bold text-[#E5D5B5] font-display">Quản lý {formCandidateTerm || "Ứng viên"} ({teachers.length})</h3>
                    <button
                      id="admin-add-teacher-btn"
                      type="button"
                      onClick={handleAddTeacherClick}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-gold-600 via-gold-500 to-bronze text-slate-950 text-xs font-bold rounded-lg hover:from-gold-500 hover:to-gold-400 transition-all shadow-lg hover:shadow-gold-500/10 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm {formCandidateTerm || "ứng viên"} mới
                    </button>
                  </div>

                  {/* Teachers Grid inside Table */}
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] overflow-hidden shadow-inner">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-black/30 border-b border-white/[0.04] text-gold-500/80 font-mono tracking-wider">
                          <th className="p-3">Hồ sơ</th>
                          <th className="p-3">Hạng mục</th>
                          <th className="p-3 text-center">Lượt Xem</th>
                          <th className="p-3 text-center">Lượt Vote</th>
                          <th className="p-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {teachers.map((teacher) => (
                          <tr key={teacher.id} className="hover:bg-gold-500/5 transition-all">
                            <td className="p-3 flex items-center gap-3">
                              <img src={teacher.avatar} alt={teacher.name} className="w-8 h-8 rounded-full object-cover border border-gold-500/15" referrerPolicy="no-referrer" />
                              <div>
                                <div className="font-semibold text-white text-sm">{teacher.name}</div>
                                <div className="text-[10px] text-slate-400">{teacher.subject}</div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gold-500/10 border border-gold-500/20 text-gold-400">
                                {teacher.category}
                              </span>
                            </td>
                            <td className="p-3 text-center text-xs font-mono text-slate-400">
                              {teacher.viewsCount || 0}
                            </td>
                            <td className="p-3 text-center text-sm font-bold text-gold-300 font-mono">
                              {teacher.votesCount}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  id={`edit-teacher-${teacher.id}-btn`}
                                  type="button"
                                  onClick={() => handleEditTeacherClick(teacher)}
                                  className="p-1.5 bg-white/[0.03] hover:bg-gold-500 hover:text-slate-950 rounded text-gold-400 border border-white/5 transition cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  id={`delete-teacher-${teacher.id}-btn`}
                                  type="button"
                                  onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                                  className="p-1.5 bg-white/[0.03] hover:bg-rose-600 hover:text-white rounded text-rose-400 border border-white/5 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: VOTE LOGS HISTORY */}
              {activeTab === "logs" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
                    <div>
                      <h3 className="text-sm font-bold text-[#E5D5B5] font-display">Lịch sử bình chọn ({voteLogs.length})</h3>
                      <p className="text-[11px] text-slate-400 font-sans font-light">Thông tin địa chỉ IP, tài khoản Google và thời gian chi tiết.</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/admin/export', {
                              headers: { 'Authorization': `Bearer ${authToken}` }
                            });
                            if (!res.ok) throw new Error('Export failed');
                            const blob = await res.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `votes_export_${new Date().toISOString().slice(0,10)}.csv`;
                            a.click();
                          } catch (e) {
                            alert('Lỗi xuất dữ liệu CSV');
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-800 text-white rounded-lg border border-slate-600 hover:bg-slate-700 hover:border-gold-500/50 text-xs font-bold transition-all shadow shadow-black/50"
                      >
                        Xuất báo cáo CSV
                      </button>

                      {/* Search Field */}
                      <div className="relative max-w-xs w-full">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold-500/60" />
                        <input
                          id="logs-search-input"
                          type="text"
                          placeholder="Tìm theo email, tên, IP..."
                          value={logsSearch}
                          onChange={(e) => setLogsSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-black border border-gold-500/15 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-gold-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Logs Table */}
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] overflow-hidden shadow-inner">
                    {filteredLogs.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">Không tìm thấy nhật ký bình chọn tương ứng.</div>
                    ) : (
                      <div className="overflow-x-auto max-h-[50vh]">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-black/30 border-b border-white/[0.04] text-gold-500/80 font-mono sticky top-0">
                              <th className="p-2.5">Thời gian</th>
                              <th className="p-2.5">Tài khoản</th>
                              <th className="p-2.5">{formCandidateTerm || "Ứng viên"} nhận vote</th>
                              <th className="p-2.5 font-mono">Client IP</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.02] font-mono">
                            {filteredLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-gold-500/5 transition-all text-[11px]">
                                <td className="p-2.5 text-slate-400 whitespace-nowrap">
                                  {new Date(log.timestamp).toLocaleString("vi-VN")}
                                </td>
                                <td className="p-2.5">
                                  <div className="font-semibold text-slate-200">{log.userName}</div>
                                  <div className="text-[10px] text-gold-400/70">{log.userEmail}</div>
                                </td>
                                <td className="p-2.5 text-gold-400 font-semibold font-sans">{log.teacherName}</td>
                                <td className="p-2.5 text-slate-500">{log.ip}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: CONFIGURATION SHEET */}
              {activeTab === "config" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-[#E5D5B5] font-display">Cấu hình Cổng bình chọn</h3>
                    <p className="text-xs text-slate-400 font-sans font-light">Bật hoặc tạm dừng nhận lượt bình chọn trực tuyến từ người dùng.</p>
                  </div>

                  <div className="p-5 rounded-xl border border-gold-500/15 bg-white/[0.01] space-y-4 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-white">Mở cổng bình chọn</div>
                        <div className="text-xs text-slate-400">
                          {votingEnabled 
                            ? "Cổng bình chọn đang mở. Người dùng có thể thực hiện bình chọn trực tiếp." 
                            : "Cổng bình chọn đang đóng. Nút bình chọn ở trang chính sẽ bị vô hiệu hóa."}
                        </div>
                      </div>
                      <button
                        id="admin-toggle-voting-portal-btn"
                        type="button"
                        onClick={handleToggleVoting}
                        className="focus:outline-none transition-colors cursor-pointer"
                      >
                        {votingEnabled ? (
                          <ToggleRight className="w-12 h-12 text-gold-400 hover:text-gold-300" />
                        ) : (
                          <ToggleLeft className="w-12 h-12 text-slate-600 hover:text-slate-500" />
                        )}
                      </button>
                    </div>

                    <div className="border-t border-white/[0.04] pt-4 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-rose-400 flex items-center gap-1.5 font-mono">
                          <RotateCcw className="w-4 h-4" />
                          Khởi động lại cuộc đua (Reset All)
                        </div>
                        <div className="text-xs text-slate-400 font-sans font-light">Xóa toàn bộ dữ liệu lịch sử bình chọn và đặt tất cả số phiếu về 0.</div>
                      </div>
                      <button
                        id="admin-reset-votes-btn"
                        type="button"
                        onClick={handleResetVotes}
                        className="px-3.5 py-1.5 bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Khởi tạo lại phiếu bầu
                      </button>
                    </div>

                    <div className="border-t border-white/[0.04] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-white flex items-center gap-1.5 font-mono">
                          Đồng hồ đếm ngược (Countdown)
                        </div>
                        <div className="text-xs text-slate-400 font-sans font-light">Thiết lập thời gian kết thúc sự kiện. Hết giờ hệ thống sẽ tự khóa vote. (Bỏ trống để tắt)</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="datetime-local"
                          value={countdownInput}
                          onChange={(e) => setCountdownInput(e.target.value)}
                          className="px-3 py-1.5 bg-black border border-gold-500/15 rounded-lg text-xs text-white focus:outline-none focus:border-gold-500 transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleSaveCountdown}
                          className="px-3 py-1.5 bg-gold-600/20 text-gold-400 hover:bg-gold-500 hover:text-slate-950 border border-gold-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Lưu
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* BRANDING SETTINGS */}
                  <div className="p-5 rounded-xl border border-gold-500/15 bg-white/[0.01] space-y-4 shadow-inner">
                    <h4 className="font-bold text-gold-400 flex items-center gap-1.5 font-mono uppercase tracking-wider mb-2">
                      Thiết lập Thông tin Thương hiệu
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1 font-mono tracking-wider">
                          Tên sự kiện / Chương trình
                        </label>
                        <input
                          type="text"
                          value={formProgramName}
                          onChange={(e) => setFormProgramName(e.target.value)}
                          placeholder="Ví dụ: Vinh Danh Nhà Giáo"
                          className="w-full px-3 py-2 bg-black border border-gold-500/15 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1 font-mono tracking-wider">
                          Tên đơn vị tổ chức (Phụ đề)
                        </label>
                        <input
                          type="text"
                          value={formProgramSubtitle}
                          onChange={(e) => setFormProgramSubtitle(e.target.value)}
                          placeholder="Ví dụ: Music House"
                          className="w-full px-3 py-2 bg-black border border-gold-500/15 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1 font-mono tracking-wider">
                          Logo Thương hiệu
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formLogoUrl}
                            onChange={(e) => setFormLogoUrl(e.target.value)}
                            placeholder="URL logo"
                            className="flex-1 px-3 py-2 bg-black border border-gold-500/15 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 transition-all font-mono"
                          />
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleUploadLogo}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <button
                              type="button"
                              disabled={isUploadingLogo}
                              className="h-full px-3 bg-gold-600/20 text-gold-400 hover:bg-gold-500 hover:text-slate-950 border border-gold-500/30 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                            >
                              {isUploadingLogo ? "Đang tải..." : "Tải lên"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1 font-mono tracking-wider">
                          Danh xưng Đối tượng bầu chọn
                        </label>
                        <input
                          type="text"
                          value={formCandidateTerm}
                          onChange={(e) => setFormCandidateTerm(e.target.value)}
                          placeholder="Ví dụ: Giáo viên, Bài hát, Bộ phim, Thí sinh..."
                          className="w-full px-3 py-2 bg-black border border-gold-500/15 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 transition-all"
                        />
                        <p className="mt-1 text-[10px] text-slate-400">Đổi từ ngữ hiển thị toàn bộ trang (Ví dụ: Thí sinh, Bài hát, Phim, Tác phẩm...)</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1 font-mono tracking-wider">
                          Nhãn thuộc tính phụ / Thể loại
                        </label>
                        <input
                          type="text"
                          value={formSubjectTerm}
                          onChange={(e) => setFormSubjectTerm(e.target.value)}
                          placeholder="Ví dụ: Bộ môn, Ca sĩ / Tác giả, Thể loại..."
                          className="w-full px-3 py-2 bg-black border border-gold-500/15 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 transition-all"
                        />
                        <p className="mt-1 text-[10px] text-slate-400">Hiển thị dưới tên ứng viên (Ví dụ: Bộ môn, Đạo diễn, Ca sĩ, Tác giả...)</p>
                      </div>
                    </div>

                    {/* AUDIO SETTINGS WITH DIRECT FILE UPLOADER */}
                    <div className="p-4 rounded-xl border border-gold-500/20 bg-black/40 space-y-4">
                      <h5 className="text-xs font-bold text-gold-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                        🎵 Tải Lên & Quản Lý File Âm Thanh
                      </h5>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* BGM Upload */}
                        <div>
                          <label className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1 font-mono tracking-wider">
                            1. Nhạc Nền Sự Kiện (.mp3)
                          </label>
                          <div className="flex gap-2 mb-1">
                            <input
                              type="text"
                              value={formBgMusicUrl}
                              onChange={(e) => setFormBgMusicUrl(e.target.value)}
                              placeholder="URL file MP3..."
                              className="flex-1 px-3 py-1.5 bg-black border border-gold-500/15 rounded-lg text-xs text-white focus:outline-none focus:border-gold-500 transition-all font-mono"
                            />
                            <label className="px-3 py-1.5 bg-gold-500/15 hover:bg-gold-500/30 text-gold-300 border border-gold-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1">
                              <Upload className="w-3.5 h-3.5" />
                              Tải MP3 lên
                              <input
                                type="file"
                                accept="audio/*"
                                onChange={(e) => handleUploadAudioFile(e, "bgMusic")}
                                className="hidden"
                                disabled={isUploadingAudio}
                              />
                            </label>
                          </div>
                          <p className="text-[10px] text-slate-400">Chọn file .mp3 trực tiếp từ máy tính của bạn!</p>
                        </div>

                        {/* Live Vote Sound Upload */}
                        <div>
                          <label className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1 font-mono tracking-wider">
                            2. Âm Thanh Khi Có Người Vote (.mp3)
                          </label>
                          <div className="flex gap-2 mb-1">
                            <input
                              type="text"
                              value={formVoteSoundUrl}
                              onChange={(e) => setFormVoteSoundUrl(e.target.value)}
                              placeholder="URL file âm thanh vote..."
                              className="flex-1 px-3 py-1.5 bg-black border border-gold-500/15 rounded-lg text-xs text-white focus:outline-none focus:border-gold-500 transition-all font-mono"
                            />
                            <label className="px-3 py-1.5 bg-gold-500/15 hover:bg-gold-500/30 text-gold-300 border border-gold-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1">
                              <Upload className="w-3.5 h-3.5" />
                              Tải MP3 lên
                              <input
                                type="file"
                                accept="audio/*"
                                onChange={(e) => handleUploadAudioFile(e, "voteSound")}
                                className="hidden"
                                disabled={isUploadingAudio}
                              />
                            </label>
                          </div>
                          <p className="text-[10px] text-slate-400">Âm thanh này sẽ vang lên cho TẤT CẢ mọi người ngay khi có 1 lượt vote trực tiếp!</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1 font-mono tracking-wider">
                          Tên thẻ Tab Trình Duyệt
                        </label>
                        <input
                          type="text"
                          value={formPageTitle}
                          onChange={(e) => setFormPageTitle(e.target.value)}
                          placeholder="VD: MUSIC HOUSE VOTE"
                          className="w-full px-3 py-2 bg-black border border-gold-500/15 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1 font-mono tracking-wider">
                          Ẩn điểm số (Blind Voting)
                        </label>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formHideResults}
                            onChange={(e) => setFormHideResults(e.target.checked)}
                            className="w-4 h-4 rounded bg-black border-gold-500/30 text-gold-500 focus:ring-gold-500/20"
                          />
                          <span className="text-sm text-slate-300">Giấu số vote với người dùng</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1 font-mono tracking-wider">
                          Tối đa vote / 1 Hạng mục
                        </label>
                        <input
                          type="number"
                          value={formMaxVotesCat}
                          onChange={(e) => setFormMaxVotesCat(e.target.value)}
                          min="1"
                          className="w-full px-3 py-2 bg-black border border-gold-500/15 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1 font-mono tracking-wider">
                          Tối đa vote / 1 Thiết bị
                        </label>
                        <input
                          type="number"
                          value={formMaxVotesDev}
                          onChange={(e) => setFormMaxVotesDev(e.target.value)}
                          min="1"
                          className="w-full px-3 py-2 bg-black border border-gold-500/15 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1 font-mono tracking-wider">
                        Đoạn văn giới thiệu sự kiện
                      </label>
                      <textarea
                        rows={3}
                        value={formProgramDescription}
                        onChange={(e) => setFormProgramDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-black border border-gold-500/15 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 transition-all resize-none"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleSaveBranding}
                        className="px-4 py-2 bg-gradient-to-r from-gold-600 via-gold-500 to-bronze text-slate-950 hover:from-gold-500 hover:to-gold-400 font-bold rounded-lg text-xs transition-all cursor-pointer shadow-lg hover:shadow-gold-500/20"
                      >
                        Lưu Thông tin Thương hiệu
                      </button>
                    </div>
                  </div>

                  {/* System limits info card */}
                  <div className="p-4 rounded-xl bg-[#0c0c0e] border border-gold-500/10 text-xs text-slate-400 space-y-2">
                    <h4 className="font-bold text-gold-400 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                      <Server className="w-4 h-4 text-gold-500" />
                      Công nghệ Chống cheat &amp; Giới hạn hệ thống tự động:
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 font-sans font-light text-slate-300">
                      <li><strong>Anti-Bot CAPTCHA:</strong> Tích hợp Turnstile ẩn tự động tại client để chặn spam script.</li>
                      <li><strong>Rate Limit:</strong> Tối đa 5 phiếu bầu/phút từ cùng một IP địa chỉ mạng (phát hiện bằng địa chỉ IP server-side).</li>
                      <li><strong>Google Auth:</strong> Bắt buộc liên kết Email Google, cấu hình tối đa 1 phiếu duy nhất trên 1 tài khoản email để tránh lập tài khoản giả.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* MODAL FORM FOR ADDING / EDITING TEACHER */}
              <AnimatePresence>
                {showForm && (
                  <div className="absolute inset-0 bg-[#050507] p-6 flex flex-col z-20 overflow-y-auto">
                    <div className="flex justify-between items-center mb-4 border-b border-white/[0.04] pb-3">
                      <h4 className="text-sm font-bold text-gold-400 flex items-center gap-1.5 uppercase font-display tracking-wider">
                        <Calendar className="w-4 h-4 text-gold-500" />
                        {editingTeacherId ? `Cập nhật hồ sơ: ${formName}` : `Thêm hồ sơ ${formCandidateTerm || "Ứng viên"} mới`}
                      </h4>
                      <button
                        id="close-teacher-form-btn"
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="p-1 text-gold-400/60 hover:text-gold-400 bg-white/[0.03] hover:bg-white/[0.08] rounded transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSubmitTeacherForm} className="space-y-4 text-left flex-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="teacher-name-input" className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1 font-mono tracking-wider">
                            Tên {formCandidateTerm || "ứng viên / Tiết mục"} *
                          </label>
                          <input
                            id="teacher-name-input"
                            type="text"
                            required
                            placeholder={`Ví dụ: ${formCandidateTerm === "Tiết Mục" ? "Tiết mục Múa Sạp" : "Hoàng Lâm"}`}
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="w-full px-3 py-2 bg-black border border-gold-500/15 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 transition-all"
                          />
                        </div>

                        <div>
                          <label htmlFor="teacher-subject-input" className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1 font-mono tracking-wider">
                            {formSubjectTerm || "Bộ môn / Thể loại / Thuộc tính"} *
                          </label>
                          <input
                            id="teacher-subject-input"
                            type="text"
                            required
                            placeholder={`Ví dụ: ${formSubjectTerm || "Tiếng Anh THPT / Nhạc dân gian"}`}
                            value={formSubject}
                            onChange={(e) => setFormSubject(e.target.value)}
                            className="w-full px-3 py-2 bg-black border border-gold-500/15 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="teacher-category-input" className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1 font-mono tracking-wider">
                            Phân nhóm / Danh hiệu *
                          </label>
                          <input
                            id="teacher-category-input"
                            list="category-options"
                            value={formCategory}
                            onChange={(e) => setFormCategory(e.target.value)}
                            placeholder="Nhập hạng mục mới hoặc chọn..."
                            className="w-full px-3 py-2 bg-black border border-gold-500/15 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 transition-all"
                          />
                          <datalist id="category-options">
                            {Array.from(new Set(teachers.map(t => t.category))).map(cat => (
                              <option key={cat} value={cat} />
                            ))}
                          </datalist>
                        </div>

                        <div>
                          <label htmlFor="teacher-youtube-input" className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1 font-mono tracking-wider">
                            Link YouTube Tiết mục (Không bắt buộc)
                          </label>
                          <input
                            id="teacher-youtube-input"
                            type="text"
                            placeholder="Nhập URL video YouTube..."
                            value={formYoutubeUrl}
                            onChange={(e) => setFormYoutubeUrl(e.target.value)}
                            className="w-full px-3 py-2 bg-black border border-gold-500/15 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 transition-all font-mono"
                          />
                        </div>

                        <div>
                          <label htmlFor="teacher-avatar-input" className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1 font-mono tracking-wider">
                            Ảnh đại diện ứng viên
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              id="teacher-avatar-input"
                              type="text"
                              placeholder="Dán URL ảnh hoặc chọn nút Tải ảnh bên cạnh"
                              value={formAvatar}
                              onChange={(e) => setFormAvatar(e.target.value)}
                              className="flex-1 px-3 py-2 bg-black border border-gold-500/15 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 transition-all font-mono"
                            />
                            <label className="px-3.5 py-2 bg-gold-500/20 border border-gold-500/40 text-gold-300 hover:bg-gold-500 hover:text-slate-950 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0">
                              <Upload className="w-4 h-4" />
                              <span>Tải ảnh từ máy</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (file.size > 5 * 1024 * 1024) {
                                    alert("Dung lượng ảnh tối đa là 5MB. Vui lòng chọn ảnh nhỏ hơn.");
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    if (event.target?.result) {
                                      setFormAvatar(event.target.result as string);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                          <p className="mt-1.5 text-xs text-slate-400 font-sans font-light">Bấm "Tải ảnh từ máy" chọn hình từ máy tính hoặc dán đường dẫn link ảnh Facebook/Google Drive vào ô trên.</p>
                        </div>
                      </div>

                      {/* Preset avatar samples picker */}
                      <div>
                        <span className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1.5 font-mono tracking-wider">Ảnh chân dung mẫu (Unsplash chất lượng cao)</span>
                        <div className="flex flex-wrap gap-2">
                          {PRESET_AVATARS.map((url, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setFormAvatar(url)}
                              className={`relative rounded-lg p-1 border-2 transition-all cursor-pointer ${
                                formAvatar === url ? "border-gold-500 bg-gold-950/25 scale-105" : "border-transparent hover:border-white/10"
                              }`}
                            >
                              <img src={url} alt={`Preset portrait ${i}`} className="w-12 h-12 rounded object-cover" referrerPolicy="no-referrer" />
                              {formAvatar === url && (
                                <div className="absolute -top-1 -right-1 bg-gold-500 text-slate-950 rounded-full p-0.5">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="teacher-bio-textarea" className="block text-[11px] font-bold text-gold-500/80 uppercase mb-1 font-mono tracking-wider">
                          Tiểu sử / Thành tựu / Mô tả ngắn
                        </label>
                        <textarea
                          id="teacher-bio-textarea"
                          rows={3}
                          placeholder="Nhập đôi nét giới thiệu về giáo viên, phương pháp giảng dạy..."
                          value={formBio}
                          onChange={(e) => setFormBio(e.target.value)}
                          className="w-full px-3 py-2 bg-black border border-gold-500/15 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 transition-all resize-none"
                        />
                      </div>

                      {formError && <p className="text-xs text-rose-500 font-semibold">{formError}</p>}

                      <div className="flex gap-3 justify-end pt-2">
                        <button
                          id="cancel-teacher-form-submit-btn"
                          type="button"
                          onClick={() => setShowForm(false)}
                          className="px-4 py-2 text-xs bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-white/5 rounded-lg transition cursor-pointer"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          id="teacher-form-submit-btn"
                          type="submit"
                          className="px-5 py-2 text-xs bg-gradient-to-r from-gold-600 via-gold-500 to-bronze text-slate-950 font-bold rounded-lg hover:from-gold-500 hover:to-gold-400 transition-all shadow-lg hover:shadow-gold-500/20 cursor-pointer"
                        >
                          Lưu hồ sơ
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
