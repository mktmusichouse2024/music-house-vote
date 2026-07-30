import React, { useState } from "react";
import { motion } from "motion/react";
import { User } from "../types";
import { UserCheck, AlertTriangle, ArrowRight, Sparkles } from "lucide-react";

interface OTPAuthModalProps {
  onLogin: (user: User, token?: string) => void;
  onClose: () => void;
}

export default function OTPAuthModal({ onLogin, onClose }: OTPAuthModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Vui lòng nhập Họ & Tên của bạn để bắt đầu bình chọn.");
      return;
    }

    // Generate unique guest identity
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "") || "guest";
    const uniqueEmail = email.trim() ? email.trim().toLowerCase() : `${slug}_${Date.now()}@guest.local`;
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`;
    const sessionToken = "session_guest_" + Math.random().toString(36).substring(2, 12);

    const newUser: User = {
      email: uniqueEmail,
      name: cleanName,
      picture: avatar
    };

    onLogin(newUser, sessionToken);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-sm bg-[#0a0a0c]/95 backdrop-blur-xl border border-gold-500/30 rounded-2xl shadow-[0_0_50px_rgba(212,175,55,0.2)] overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-gold-600 via-gold-400 to-amber-500" />
        
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-14 h-14 bg-gradient-to-br from-gold-500/20 to-amber-600/20 rounded-full flex items-center justify-center border border-gold-500/30 shadow-[0_0_20px_rgba(212,175,55,0.3)] mb-3 animate-pulse">
              <UserCheck className="w-7 h-7 text-gold-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-[#E5D5B5] font-display uppercase tracking-wider">
              Xác Nhận Người Bình Chọn
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Vui lòng nhập tên của bạn để tham gia bình chọn trực tiếp. Mỗi người có đúng <span className="text-gold-300 font-bold">2 lượt bình chọn</span>!
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-500/30 rounded-lg flex gap-2 items-start text-red-200 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gold-500/90 uppercase tracking-wider mb-1">
                Tên / Biệt danh của bạn <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A, Học viên Tuấn..."
                required
                className="w-full bg-black/60 border border-gold-500/30 text-[#E5D5B5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/50 transition-all placeholder:text-slate-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Email của bạn (Không bắt buộc)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@vidu.com (Không bắt buộc)"
                className="w-full bg-black/40 border border-white/10 text-slate-300 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-gold-500/50 transition-all placeholder:text-slate-600"
              />
            </div>

            <button
              type="submit"
              className="w-full relative group overflow-hidden bg-gradient-to-r from-gold-600 via-gold-500 to-amber-500 text-slate-950 font-black rounded-xl py-3.5 px-4 flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:shadow-[0_0_35px_rgba(212,175,55,0.6)] transition-all cursor-pointer mt-2"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Bắt Đầu Bình Chọn (2 Lượt)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
