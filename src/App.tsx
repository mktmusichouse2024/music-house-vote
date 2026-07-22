import { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Teacher, User } from "./types";
import TurnstileCaptcha from "./components/TurnstileCaptcha";
import OTPAuthModal from "./components/OTPAuthModal";
import AdminPanel from "./components/AdminPanel";
import { getFingerprint } from "./utils/fingerprint";
import { 
  Heart, ShieldAlert, Award, Star, Trophy, Users, ShieldCheck, 
  LogOut, CheckCircle, Key, Loader2, RefreshCw, X, Clock, Crown, Sparkles, Leaf
} from "lucide-react";

const CATEGORIES = ["Giáo viên được yêu thích nhất", "Giáo viên cống hiến nhất"];
const MUSIC_NOTES = ["♪", "♫", "♩", "♬", "♭", "♮", "♯", "𝄞", "🎹", "🎻", "🎸", "🎺"];

const FLOATING_PARTICLES = Array.from({ length: 8 }).map((_, i) => {
  const size = Math.floor(Math.random() * 5) + 3; // 3px to 8px
  const delay = Math.random() * 8;
  const duration = Math.random() * 15 + 15; // 15s to 30s
  const left = `${Math.floor(Math.random() * 98)}%`;
  const isGold = i % 2 === 0;
  return { id: i, size, delay, duration, left, isGold };
});



export default function App() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [votingEnabled, setVotingEnabled] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Giáo viên được yêu thích nhất");
  const [loading, setLoading] = useState(true);
  const [countdownEnd, setCountdownEnd] = useState<string | null>(null);
  const [appConfig, setAppConfig] = useState<{
    logoUrl: string;
    programName: string;
    programSubtitle: string;
    programDescription: string;
  }>({
    logoUrl: "/logo.svg",
    programName: "Vinh Danh Nhà Giáo",
    programSubtitle: "Music House",
    programDescription: "Cơ hội để các học viên tri ân những cống hiến thầm lặng và bầu chọn cho người thầy được yêu thích nhất. Hãy cùng tạo ra kết quả công bằng, xứng đáng nhất!"
  });
  const [timeLeft, setTimeLeft] = useState<{d: number, h: number, m: number, s: number} | null>(null);
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string>("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Voting flow modal state
  const [votingTeacher, setVotingTeacher] = useState<Teacher | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaResetTrigger, setCaptchaResetTrigger] = useState(0);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [voteMessage, setVoteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Admin state
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Live Activity feed
  const [recentVoteMessage, setRecentVoteMessage] = useState<string | null>(null);

  // Load active session and fetch teachers list
  useEffect(() => {
    const savedUser = localStorage.getItem("google_user_session");
    const savedToken = localStorage.getItem("google_session_token");
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setSessionToken(savedToken);
      } catch (e) {
        console.error("Error loading saved user session", e);
      }
    }
    
    fetchTeachers();

    // Setup Server-Sent Events for Realtime
    const eventSource = new EventSource("/api/events");
    
    eventSource.addEventListener("sync", (event) => {
      const data = JSON.parse(event.data);
      if (data.teachers) setTeachers(data.teachers);
      if (data.config) {
        setVotingEnabled(data.config.votingEnabled);
        setCountdownEnd(data.config.countdownEnd);
        setAppConfig({
          logoUrl: data.config.logoUrl || "/logo.svg",
          programName: data.config.programName || "Vinh Danh Nhà Giáo",
          programSubtitle: data.config.programSubtitle || "Music House",
          programDescription: data.config.programDescription || "Cơ hội để các học viên tri ân những cống hiến thầm lặng và bầu chọn cho người thầy được yêu thích nhất. Hãy cùng tạo ra kết quả công bằng, xứng đáng nhất!"
        });
      }
      setLoading(false);
    });
    
    eventSource.addEventListener("vote", (event) => {
      const data = JSON.parse(event.data);
      if (data.teachers) setTeachers(data.teachers);
      if (data.latestVote) {
        setRecentVoteMessage(`Học viên ${data.latestVote.userName} vừa bình chọn cho ${data.latestVote.teacherName}`);
        setTimeout(() => setRecentVoteMessage(null), 5500);
      }
    });
    
    eventSource.addEventListener("config", (event) => {
      const data = JSON.parse(event.data);
      setVotingEnabled(data.votingEnabled);
      setCountdownEnd(data.countdownEnd);
      setAppConfig({
        logoUrl: data.logoUrl || "/logo.svg",
        programName: data.programName || "Vinh Danh Nhà Giáo",
        programSubtitle: data.programSubtitle || "Music House",
        programDescription: data.programDescription || "Cơ hội để các học viên tri ân những cống hiến thầm lặng và bầu chọn cho người thầy được yêu thích nhất. Hãy cùng tạo ra kết quả công bằng, xứng đáng nhất!"
      });
    });

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (!countdownEnd) {
      setTimeLeft(null);
      return;
    }
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(countdownEnd).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        setVotingEnabled(false);
        clearInterval(interval);
      } else {
        setTimeLeft({
          d: Math.floor(distance / (1000 * 60 * 60 * 24)),
          h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownEnd]);

  const fetchTeachers = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner && teachers.length === 0) setLoading(true);
    try {
      const response = await fetch("/api/teachers");
      const data = await response.json();
      if (data.teachers) {
        setTeachers(data.teachers);
        setVotingEnabled(data.votingEnabled);
        setCountdownEnd(data.countdownEnd);
        if (data.config) {
          setAppConfig({
            logoUrl: data.config.logoUrl || "/logo.svg",
            programName: data.config.programName || "Vinh Danh Nhà Giáo",
            programSubtitle: data.config.programSubtitle || "Music House",
            programDescription: data.config.programDescription || "Cơ hội để các học viên tri ân những cống hiến thầm lặng và bầu chọn cho người thầy được yêu thích nhất. Hãy cùng tạo ra kết quả công bằng, xứng đáng nhất!"
          });
        }
      }
    } catch (error) {
      console.error("Error loading teachers", error);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  const handleLogin = (newUser: User, token?: string) => {
    setUser(newUser);
    localStorage.setItem("google_user_session", JSON.stringify(newUser));
    if (token) {
      setSessionToken(token);
      localStorage.setItem("google_session_token", token);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setSessionToken("");
    localStorage.removeItem("google_user_session");
    localStorage.removeItem("google_session_token");
  };

  const openVotingFlow = (teacher: Teacher) => {
    setVotingTeacher(teacher);
    setCaptchaVerified(false);
    setCaptchaResetTrigger((prev) => prev + 1);
    setVoteMessage(null);
  };

  const closeVotingFlow = () => {
    setVotingTeacher(null);
    setVoteMessage(null);
  };

  const handleCastVoteSubmit = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!captchaVerified) {
      alert("Vui lòng thực hiện xác minh CAPTCHA trước!");
      return;
    }
    if (!votingTeacher) return;

    setIsSubmittingVote(true);
    setVoteMessage(null);

    try {
      const deviceId = await getFingerprint();
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          teacherId: votingTeacher.id,
          email: user.email,
          name: user.name || "Học viên",
          picture: user.picture,
          captchaToken: "turnstile-token-simulated-success",
          deviceId: deviceId
        })
      });
      const data = await response.json();
      
      if (data.success) {
        setVoteMessage({ type: "success", text: data.message });
        // Update local teachers count immediately
        if (data.teachers) setTeachers(data.teachers);
        
        // Auto close after 2.5s on success
        setTimeout(() => {
          setVotingTeacher(null);
          setVoteMessage(null);
        }, 2500);
      } else {
        setVoteMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      setVoteMessage({ type: "error", text: "Lỗi kết nối máy chủ. Vui lòng thử lại sau." });
    } finally {
      setIsSubmittingVote(false);
    }
  };

  // Filter & SORT by votesCount descending for the real-time leaderboard
  const filteredTeachers = teachers.filter(t => t.category === selectedCategory);

  const sortedTeachers = [...filteredTeachers].sort((a, b) => b.votesCount - a.votesCount);
  
  // Take Top 3 for the Podium
  const top3 = sortedTeachers.slice(0, 3);
  const remainingTeachers = sortedTeachers.slice(3);

  const rank1 = top3[0] || null;
  const rank2 = top3[1] || null;
  const rank3 = top3[2] || null;

  const renderTeacherCard = (teacher: Teacher, realRank: number) => {
    const ledColorClass = 
      teacher.category === "Giáo viên được yêu thích nhất" 
        ? "neon-glow-gold" 
        : "neon-glow-bronze";

    return (
      <motion.div
        key={teacher.id}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="group relative rounded-xl border border-white/[0.04] bg-[#0c0c0e]/80 hover:bg-[#0c0c0e]/95 hover:border-gold-500/30 transition-all p-1.5 sm:p-2 flex flex-col justify-between shadow-[0_5px_15px_rgba(0,0,0,0.5)] w-full min-w-[120px] max-w-[180px]"
      >
        <div className={`absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity ${
          teacher.category === "Giáo viên được yêu thích nhất" 
            ? "from-gold-600 to-gold-400" 
            : "from-bronze to-gold-600"
        }`} />

        <div className="flex flex-col items-center">
          <div className="relative mb-2">
            <div className={`absolute -inset-0.5 rounded-full ${ledColorClass} transition-all opacity-40 group-hover:opacity-100`} />
            <img
              src={teacher.avatar}
              alt={teacher.name}
              className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-slate-950 shadow-lg"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-900 border border-white/10 rounded-full flex items-center justify-center font-bold text-[9px] font-mono text-slate-400">
              {realRank}
            </div>
          </div>
          
          <h3 className="text-[11px] sm:text-xs font-bold text-center text-white group-hover:text-gold-300 font-display line-clamp-1">
            {teacher.name}
          </h3>
          <span className="text-[8px] font-bold tracking-widest text-gold-400/80 uppercase font-mono mt-0.5 line-clamp-1">
            {teacher.subject}
          </span>
        </div>

        <div className="pt-2 mt-2 border-t border-white/[0.02] flex items-center justify-between w-full">
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3 text-rose-500" />
            <span className="text-[10px] font-bold font-mono text-white">{teacher.votesCount}</span>
          </div>
          <button
            id={`vote-teacher-${teacher.id}-btn`}
            type="button"
            disabled={!votingEnabled}
            onClick={() => openVotingFlow(teacher)}
            className={`px-2 py-1 rounded text-[9px] font-bold transition-all shadow-sm ${
              votingEnabled
                ? "bg-gold-950/40 hover:bg-gold-500 text-gold-400 hover:text-slate-950 border border-gold-500/30"
                : "bg-black/40 text-slate-600 border border-white/5"
            }`}
          >
            Bầu
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="relative h-screen bg-[#02050f] text-[#f3f4f6] overflow-hidden font-sans flex flex-col w-full">
      
      {/* GRAND AWARD DYNAMIC BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMwMzA3MTIiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjMWUxZTJmIi8+PC9zdmc+')] opacity-40 mix-blend-screen"></div>
        
        {/* Flash Photography Effect */}
        <div className="absolute inset-0 bg-white animate-flash mix-blend-overlay opacity-50"></div>
        
        {/* Sweeping Spotlights (Crossing) */}
        <div className="absolute -bottom-[50%] left-[-20%] w-[150%] h-[150%] animate-spotlight opacity-60"></div>
        <div className="absolute -bottom-[50%] left-[-20%] w-[150%] h-[150%] animate-spotlight-reverse opacity-60"></div>
        
        {/* Golden Base Glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80vw] h-[40vh] bg-gold-600/15 blur-[100px] rounded-full mix-blend-screen"></div>
        
        {/* Fast Sparks Shooting Up */}
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={`spark-${i}`}
            className="absolute bottom-[-10px] w-[2px] h-[15px] rounded-full bg-gold-400 animate-spark shadow-[0_0_12px_#fcd34d]"
            style={{
              left: `${Math.random() * 100}vw`,
              animationDuration: `${Math.random() * 1.5 + 0.8}s`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* TOP HEADER MENU - COMPACT */}
      <header className="relative z-30 w-full border-b border-gold-500/15 bg-[#050507]/80 backdrop-blur-xl px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <img src={appConfig.logoUrl} alt="Logo" className="w-7 h-7 rounded-full border border-white/10 shrink-0 shadow-lg shadow-sky-500/10 object-cover" />
          <div className="hidden sm:block">
            <span className="text-[10px] font-extrabold font-sans text-gold-400 tracking-wider uppercase block leading-none">{appConfig.programSubtitle}</span>
            <div className="flex items-center gap-1 mt-0.5 text-[8px] text-[#C5A880] font-mono leading-none">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
              <span>LIVE</span>
            </div>
          </div>
        </div>

        {/* Voting Status Banner */}
        {!votingEnabled && (
          <div className="flex items-center justify-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-semibold animate-pulse absolute left-1/2 -translate-x-1/2 hidden md:flex">
            <ShieldAlert className="w-3 h-3 shrink-0" />
            <span>Cổng bình chọn đang đóng</span>
          </div>
        )}

        {/* User Session Info / Google Login button */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2 bg-gold-950/10 border border-gold-500/20 p-1 pr-3 rounded-full shadow-inner">
              <img
                src={user.picture}
                alt={user.name}
                className="w-6 h-6 rounded-full object-cover border border-gold-500/30"
                referrerPolicy="no-referrer"
              />
              <div className="text-left hidden md:block">
                <div className="text-[10px] font-bold text-[#faf2db] leading-none truncate max-w-[100px]">{user.name}</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1 hover:text-rose-400 text-[#C5A880]/60 transition-colors ml-1"
                title="Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-full bg-gradient-to-r from-gold-600 via-gold-500 to-bronze text-slate-950 hover:shadow-gold-500/20 shadow-md"
            >
              <span>Đăng nhập</span>
            </button>
          )}
          
          <button
            type="button"
            onClick={() => setShowAdminPanel(true)}
            className="p-1.5 rounded-full border border-gold-500/20 bg-gold-500/5 hover:bg-gold-500/10 text-gold-500 transition"
            title="Admin"
          >
            <Key className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* MAIN FIT-TO-SCREEN DASHBOARD CONTENT */}
      <main className="flex-1 relative z-10 flex flex-col w-full max-w-[1920px] mx-auto overflow-hidden px-2 sm:px-4 pb-2 pt-2">
        
        {/* INFO BAR: Title + Categories + Countdown */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 shrink-0 bg-black/20 border border-white/5 rounded-2xl p-2 sm:p-3 backdrop-blur-sm shadow-xl mb-3">
          
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left shrink-0">
            <h1 className="text-xl sm:text-2xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-white via-champagne to-gold-400 tracking-tight uppercase drop-shadow-md">
              {appConfig.programName}
            </h1>
            <p className="text-[10px] text-[#C5A880]/80 mt-0.5 max-w-sm hidden sm:block line-clamp-1">
              {appConfig.programDescription}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            {/* CATEGORIES */}
            <div className="flex items-center gap-1 p-1 bg-black/50 border border-gold-500/15 rounded-xl shadow-inner shrink-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg transition-all relative whitespace-nowrap ${
                    selectedCategory === cat
                      ? "text-slate-950 bg-gradient-to-r from-gold-500 to-gold-400 shadow-md"
                      : "text-slate-400 hover:text-champagne hover:bg-white/5"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* COUNTDOWN */}
            {timeLeft && (
              <div className="flex items-center gap-2 bg-black/60 border border-gold-500/30 px-3 py-1.5 rounded-xl shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                <Clock className="w-3.5 h-3.5 text-gold-400 animate-pulse hidden sm:block" />
                <div className="flex items-center gap-1 text-gold-400 font-mono text-sm sm:text-base font-bold">
                  <div className="flex flex-col items-center"><span className="leading-none text-white">{timeLeft.d.toString().padStart(2, "0")}</span><span className="text-[7px]">NGÀY</span></div><span className="pb-2">:</span>
                  <div className="flex flex-col items-center"><span className="leading-none text-white">{timeLeft.h.toString().padStart(2, "0")}</span><span className="text-[7px]">GIỜ</span></div><span className="pb-2">:</span>
                  <div className="flex flex-col items-center"><span className="leading-none text-white">{timeLeft.m.toString().padStart(2, "0")}</span><span className="text-[7px]">PHÚT</span></div><span className="pb-2">:</span>
                  <div className="flex flex-col items-center"><span className="leading-none text-gold-400">{timeLeft.s.toString().padStart(2, "0")}</span><span className="text-[7px]">GIÂY</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LOADING ENGINE */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Chưa có giáo viên nào thuộc danh mục này.
          </div>
        ) : (
          <div className="flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden relative pb-1">
            
            {/* HYBRID FLANKED PODIUM LAYOUT */}
            <div className="w-full max-w-[1400px] shrink-0 mx-auto px-2 relative z-20 mb-6 sm:mb-8 flex flex-col lg:flex-row items-end justify-center gap-4 xl:gap-8">
              
              {/* LEFT FLANK (Desktop Only) */}
              <div className="hidden lg:flex flex-col justify-end gap-3 pb-4 w-[160px] xl:w-[200px] shrink-0">
                {remainingTeachers.slice(0, 2).map((teacher, idx) => (
                  <div key={teacher.id} className="w-full h-fit shadow-xl rounded-xl">
                    {renderTeacherCard(teacher, idx + 4)}
                  </div>
                ))}
              </div>

              {/* TOP 3 PODIUM */}
              <div className="w-full lg:w-auto lg:flex-1 max-w-4xl h-[320px] sm:h-[360px] relative z-20 origin-bottom scale-[0.75] xl:scale-85 transition-transform">
                {/* Podium display */}
                <div className="flex items-end justify-center gap-2 sm:gap-4 h-full pt-16 sm:pt-20 pb-4">
                

          {/* RANK 2 (Silver) */}
          {rank2 ? (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="flex flex-col items-center justify-end h-[85%] w-[30%] z-10"
            >
              <div className="relative group w-full bg-[#0a0a0c]/80 backdrop-blur-3xl border border-slate-400/20 rounded-t-3xl hover:bg-slate-900/60 transition-all shadow-[0_-15px_35px_rgba(0,0,0,0.5)] text-center flex flex-col justify-between h-full border-b-0">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-400/10 to-transparent rounded-t-3xl pointer-events-none" />
                
                {/* Inner Content */}
                <div className="p-3 sm:p-5 flex flex-col flex-1 relative z-10">
                  <div className="relative -mt-12 sm:-mt-16 mb-3 flex flex-col items-center">
                    <div className="relative mt-2">
                      <div className="absolute -inset-2 rounded-full border border-slate-300 border-dashed animate-[spin_10s_linear_infinite] opacity-30" />
                      <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-slate-500 to-slate-200 blur-sm opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                      <img
                        src={rank2.avatar}
                        alt={rank2.name}
                        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-[3px] border-slate-300 shadow-[0_0_20px_rgba(148,163,184,0.4)]"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -bottom-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-slate-200 to-slate-500 text-slate-950 rounded-full flex items-center justify-center font-black text-xs sm:text-sm shadow-xl border border-white/50">
                        2
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center relative z-10">
                    <h3 className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-white line-clamp-1 font-display tracking-wide drop-shadow-md">{rank2.name}</h3>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium uppercase tracking-[0.15em] mt-1 line-clamp-2 sm:line-clamp-1 leading-tight">{rank2.category}</p>
                  </div>

                  <div className="border-t border-slate-500/20 pt-3 mt-3 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 relative z-10">
                    <div className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded-full border border-slate-500/20">
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/50" />
                      <span className="text-xs sm:text-sm font-bold text-slate-200">{rank2.votesCount}</span>
                    </div>
                    <button
                      type="button"
                      disabled={!votingEnabled}
                      onClick={() => openVotingFlow(rank2)}
                      className="px-3 py-1 rounded-md text-[9px] sm:text-[10px] font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all shadow-sm flex items-center justify-center border border-slate-600/50"
                    >
                      Bầu
                    </button>
                  </div>
                </div>

                {/* Integrated Podium Base */}
                <div className="w-full bg-gradient-to-b from-slate-800 to-[#050507] border-t border-slate-500/40 py-2 sm:py-3 flex items-center justify-center relative overflow-hidden shrink-0">
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                   <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-slate-300/50 to-transparent" />
                   <span className="text-xs sm:text-sm font-black text-slate-300 uppercase tracking-[0.25em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10">Silver</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="w-[30%] h-full" />
          )}

          {/* RANK 1 (Gold) */}
          {rank1 ? (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1.05, y: 0 }}
              style={{ transformOrigin: "bottom center" }}
              className="flex flex-col items-center justify-end h-full w-[36%] z-20 origin-bottom"
            >
              <div className="relative group w-full bg-[#0a0a0c]/80 backdrop-blur-3xl border border-yellow-500/30 rounded-t-3xl hover:bg-yellow-950/60 transition-all shadow-[0_-20px_50px_rgba(234,179,8,0.2)] text-center flex flex-col justify-between h-full border-b-0">
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/15 to-transparent rounded-t-3xl pointer-events-none" />
                
                {/* Premium Glow Behind Podium */}
                <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[150%] bg-yellow-500/20 blur-[80px] rounded-full pointer-events-none" />
                
                {/* Inner Content */}
                <div className="p-4 sm:p-6 flex flex-col flex-1 relative z-10">
                  <div className="relative -mt-16 sm:-mt-20 mb-4 flex flex-col items-center">
                    <motion.div 
                      animate={{ y: [0, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      className="absolute -top-16 sm:-top-24 text-yellow-400 flex flex-col items-center z-40"
                    >
                      <Crown className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-300 drop-shadow-[0_0_25px_rgba(234,179,8,1)] fill-yellow-500" />
                      <Sparkles className="absolute -top-2 -right-4 w-6 h-6 text-yellow-200 animate-ping opacity-80" />
                      <Sparkles className="absolute -bottom-2 -left-4 w-4 h-4 text-yellow-100 animate-pulse" />
                    </motion.div>
                    
                    <div className="relative mt-4">
                      {/* Perfectly Centered Responsive Leaf Wreath */}
                      <div className="absolute inset-0 z-0 pointer-events-none animate-[spin_20s_linear_infinite]">
                        {Array.from({ length: 14 }).map((_, i) => (
                          <div 
                            key={i} 
                            className="absolute top-1/2 left-1/2" 
                            style={{ rotate: `${i * (360/14)}deg` }}
                          >
                             <Leaf 
                               className="absolute -top-2.5 -left-2.5 sm:-top-3.5 sm:-left-3.5 w-5 h-5 sm:w-7 sm:h-7 text-yellow-500 fill-yellow-500/50 drop-shadow-[0_0_8px_rgba(234,179,8,1)] -translate-y-[52px] sm:-translate-y-[72px]" 
                               style={{ rotate: '90deg' }} 
                             />
                          </div>
                        ))}
                      </div>
                      {/* Auras */}
                      <div className="absolute -inset-4 sm:-inset-5 rounded-full bg-gradient-to-tr from-yellow-600 via-yellow-300 to-yellow-600 shadow-[0_0_50px_rgba(234,179,8,0.8)] animate-[spin_6s_linear_infinite] opacity-60" />
                      <div className="absolute -inset-2 sm:-inset-3 rounded-full bg-black/60 backdrop-blur-md" />
                      
                      <img
                        src={rank1.avatar}
                        alt={rank1.name}
                        className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover border-[4px] border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.5)] z-10"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 text-black rounded-full flex items-center justify-center font-black text-sm sm:text-base shadow-[0_0_15px_rgba(234,179,8,0.8)] border-2 border-yellow-900 z-20">
                        1
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center relative z-10">
                    <h3 className="text-base sm:text-xl font-bold text-white group-hover:text-yellow-300 font-display line-clamp-1 tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{rank1.name}</h3>
                    <p className="text-[10px] sm:text-xs text-yellow-500 font-bold uppercase tracking-[0.2em] mt-1 line-clamp-2 sm:line-clamp-1 leading-tight">{rank1.category}</p>
                  </div>

                  <div className="border-t border-yellow-500/20 pt-3 mt-3 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 relative z-10">
                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-yellow-500/30">
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                      <span className="text-sm sm:text-base font-bold text-yellow-400">{rank1.votesCount}</span>
                    </div>
                    <button
                      type="button"
                      disabled={!votingEnabled}
                      onClick={() => openVotingFlow(rank1)}
                      className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 text-black hover:shadow-[0_0_20px_rgba(234,179,8,0.6)] shadow-lg hover:scale-105 transition-all"
                    >
                      Bầu chọn
                    </button>
                  </div>
                </div>

                {/* Integrated Podium Base */}
                <div className="w-full bg-gradient-to-b from-yellow-900 to-[#020202] border-t border-yellow-500/50 py-3 sm:py-5 flex items-center justify-center relative overflow-hidden shrink-0">
                   <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                   <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-80" />
                   <span className="text-sm sm:text-base font-black text-yellow-500 uppercase tracking-[0.3em] drop-shadow-[0_0_10px_rgba(234,179,8,0.8)] z-10">Gold</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="w-[36%] h-full" />
          )}

          {/* RANK 3 (Bronze) */}
          {rank3 ? (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="flex flex-col items-center justify-end h-[75%] w-[28%] z-10"
            >
              <div className="relative group w-full bg-[#0a0a0c]/80 backdrop-blur-3xl border border-orange-700/30 rounded-t-3xl hover:bg-orange-950/60 transition-all shadow-[0_-15px_35px_rgba(0,0,0,0.5)] text-center flex flex-col justify-between h-full border-b-0">
                <div className="absolute inset-0 bg-gradient-to-b from-orange-600/10 to-transparent rounded-t-3xl pointer-events-none" />
                
                {/* Inner Content */}
                <div className="p-3 sm:p-5 flex flex-col flex-1 relative z-10">
                  <div className="relative -mt-10 sm:-mt-14 mb-2 flex flex-col items-center">
                    <div className="relative mt-2">
                      <div className="absolute -inset-2 rounded-full border border-orange-500 border-dashed animate-[spin_10s_linear_infinite] opacity-40" />
                      <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-orange-700 to-orange-400 blur-sm opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                      <img
                        src={rank3.avatar}
                        alt={rank3.name}
                        className="relative w-14 h-14 sm:w-18 sm:h-18 rounded-full object-cover border-[3px] border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -bottom-2 -right-2 w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-orange-400 to-orange-700 text-black rounded-full flex items-center justify-center font-black text-[10px] sm:text-xs shadow-xl border border-white/30">
                        3
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center relative z-10">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-white line-clamp-1 font-display tracking-wide drop-shadow-md">{rank3.name}</h3>
                    <p className="text-[8px] sm:text-[9px] text-orange-400/80 font-medium uppercase tracking-[0.15em] mt-1 line-clamp-2 sm:line-clamp-1 leading-tight">{rank3.category}</p>
                  </div>

                  <div className="border-t border-orange-500/20 pt-2 mt-2 flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-0 relative z-10">
                    <div className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded-full border border-orange-500/20">
                      <Heart className="w-3 h-3 text-rose-500 fill-rose-500/50" />
                      <span className="text-[10px] sm:text-xs font-bold text-slate-200">{rank3.votesCount}</span>
                    </div>
                    <button
                      type="button"
                      disabled={!votingEnabled}
                      onClick={() => openVotingFlow(rank3)}
                      className="px-2 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-bold bg-orange-950/80 text-orange-400 hover:bg-orange-900 hover:text-orange-200 border border-orange-700/50 transition-all shadow-lg"
                    >
                      Bầu
                    </button>
                  </div>
                </div>

                {/* Integrated Podium Base */}
                <div className="w-full bg-gradient-to-b from-orange-900 to-[#050507] border-t border-orange-700/40 py-2 sm:py-3 flex items-center justify-center relative overflow-hidden shrink-0">
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                   <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
                   <span className="text-[10px] sm:text-xs font-black text-orange-500 uppercase tracking-[0.25em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10">Bronze</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="w-[36%] h-full" />
          )}


              </div>
            </div>

            {/* RIGHT FLANK (Desktop Only) */}
            <div className="hidden lg:flex flex-col justify-end gap-3 pb-4 w-[160px] xl:w-[200px] shrink-0">
              {remainingTeachers.slice(2, 4).map((teacher, idx) => (
                <div key={teacher.id} className="w-full h-fit shadow-xl rounded-xl">
                  {renderTeacherCard(teacher, idx + 6)}
                </div>
              ))}
            </div>
          </div>

          {/* REMAINING TEACHERS - AUTO SCALING DENSE GRID */}
          <div className="flex-1 w-full flex flex-col content-start justify-start px-2 sm:px-4 pb-4 overflow-y-auto custom-scrollbar z-20">
            {/* Mobile: all remaining */}
            <div className="lg:hidden flex flex-wrap justify-center content-start gap-2 sm:gap-3 w-full">
              {remainingTeachers.map((teacher, idx) => renderTeacherCard(teacher, idx + 4))}
            </div>
            {/* Desktop: skip first 4 */}
            <div className="hidden lg:flex flex-wrap justify-center content-start gap-2 sm:gap-3 w-full">
              {remainingTeachers.slice(4).map((teacher, idx) => renderTeacherCard(teacher, idx + 8))}
            </div>
          </div>
    </div>
  )}
</main>

      {/* VOTING FLOW MODAL */}
      <AnimatePresence>
        {votingTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={closeVotingFlow} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gold-500/30 bg-[#0a0a0c] shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-10"
            >
              {/* Modal Header */}
              <div className="relative p-5 text-center">
                <div className="absolute inset-0 bg-gradient-to-b from-gold-900/20 to-transparent pointer-events-none" />
                
                <h3 className="text-xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500">
                  Xác nhận Bình chọn
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Mỗi tài khoản hợp lệ chỉ được bỏ 1 phiếu duy nhất
                </p>

                <div className="mt-5 flex flex-col items-center">
                  <div className="relative">
                    <img
                      src={votingTeacher.avatar}
                      alt={votingTeacher.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-gold-500 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-2 right-0 bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-rose-400 shadow-md">
                      <Heart className="w-3 h-3 inline-block mr-1 fill-white" />
                      {votingTeacher.votesCount}
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-white mt-3">{votingTeacher.name}</h4>
                  <span className="text-[10px] font-mono text-gold-400 bg-gold-950/30 px-2 py-0.5 rounded border border-gold-500/20 mt-1 uppercase">
                    {votingTeacher.category}
                  </span>
                </div>
              </div>

              {/* Interaction Area */}
              <div className="p-5 bg-black/40 border-t border-white/[0.04]">
                {!user ? (
                  <div className="text-center py-2">
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs mb-4 flex items-center justify-center gap-2">
                      <ShieldAlert className="w-4 h-4" />
                      Yêu cầu đăng nhập Google để bình chọn
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAuthModal(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold bg-slate-100 text-slate-900 hover:bg-white transition-all shadow-md"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" className="opacity-75" />
                      </svg>
                      Đăng nhập Google
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-emerald-950/30 border border-emerald-500/20 p-3 rounded-lg flex items-center gap-3">
                      <img src={user.picture} alt="" className="w-8 h-8 rounded-full border border-emerald-500/30" />
                      <div>
                        <div className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Danh tính hợp lệ
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{user.email}</div>
                      </div>
                    </div>

                    <div className="bg-black/50 p-2 rounded-lg border border-white/5 flex justify-center">
                      <TurnstileCaptcha
                        onVerify={() => setCaptchaVerified(true)}
                        onExpire={() => setCaptchaVerified(false)}
                        resetTrigger={captchaResetTrigger}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={closeVotingFlow}
                        className="flex-1 py-3 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={!user || !captchaVerified || isSubmittingVote}
                        onClick={handleCastVoteSubmit}
                        className={`flex-[2] py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                          user && captchaVerified && !isSubmittingVote
                            ? "bg-gradient-to-r from-gold-600 via-gold-500 to-bronze text-slate-950 hover:shadow-gold-500/20 hover:shadow-lg cursor-pointer"
                            : "bg-slate-900 text-slate-600 cursor-not-allowed border border-white/5"
                        }`}
                      >
                        {isSubmittingVote ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                            Đang lưu...
                          </>
                        ) : (
                          <>
                            <Heart className="w-4 h-4 fill-slate-950" />
                            Xác nhận Bình chọn
                          </>
                        )}
                      </button>
                    </div>

                    {voteMessage && (
                      <div className={`mt-4 p-3 rounded-lg text-sm text-center font-bold animate-in fade-in zoom-in-95 ${
                        voteMessage.type === "success" 
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                          : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                      }`}>
                        {voteMessage.text}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OTP AUTH & ADMIN MODALS */}
      <AnimatePresence>
        {showAuthModal && (
          <OTPAuthModal
            onLogin={handleLogin}
            onClose={() => setShowAuthModal(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAdminPanel && (
          <AdminPanel
            teachers={teachers}
            votingEnabled={votingEnabled}
            appConfig={appConfig}
            onRefreshData={() => fetchTeachers(false)}
            onClose={() => setShowAdminPanel(false)}
            currentUser={user}
            sessionToken={sessionToken}
          />
        )}
      </AnimatePresence>

      {/* Live Activity Ticker Toast */}
      <div className="fixed bottom-4 right-4 z-50 max-w-sm pointer-events-none">
        <AnimatePresence mode="wait">
          {recentVoteMessage && (
            <motion.div
              key={recentVoteMessage}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="pointer-events-auto flex items-center gap-3 p-3 rounded-xl bg-black/90 border border-gold-500/30 backdrop-blur-md shadow-[0_10px_25px_rgba(212,175,55,0.2)]"
            >
              <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 shrink-0">
                <Award className="w-4 h-4 animate-pulse" />
              </div>
              <div className="text-left pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                  <span className="text-[9px] font-bold text-rose-500 font-mono tracking-widest uppercase">LIVER STREAM</span>
                </div>
                <p className="text-[11px] font-semibold text-slate-200 mt-0.5">{recentVoteMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FOOTER SECTION - Compact */}
      <footer className="w-full border-t border-gold-500/10 bg-[#050507]/80 backdrop-blur-md py-1.5 px-4 relative z-20 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-500 shrink-0">
        <div className="flex items-center gap-1">
          <span>© 2026 {appConfig.programSubtitle.toUpperCase()}</span>
          <span className="hidden sm:inline">• CAPTCHA Secured</span>
        </div>
        <button
          type="button"
          onClick={() => setShowAdminPanel(true)}
          className="flex items-center gap-1 text-gold-500/50 hover:text-gold-400 transition"
        >
          <Key className="w-3 h-3" /> Admin
        </button>
      </footer>
    </div>
  );
}
