import React, { useState } from "react";
import { motion } from "motion/react";
import { User } from "../types";
import { Mail, KeyRound, AlertTriangle, Loader2, ArrowRight } from "lucide-react";

interface OTPAuthModalProps {
  onLogin: (user: User, token?: string) => void;
  onClose: () => void;
}

export default function OTPAuthModal({ onLogin, onClose }: OTPAuthModalProps) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.toLowerCase().endsWith("@gmail.com")) {
      setError("Vui lòng sử dụng địa chỉ email @gmail.com hợp lệ.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStep("otp");
      } else {
        setError(data.message || "Đã có lỗi xảy ra. Vui lòng thử lại.");
      }
    } catch (err) {
      setError("Mất kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Mã OTP phải có 6 chữ số.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });
      
      const data = await response.json();
      
      if (data.success) {
        onLogin(data.user, data.token);
        onClose();
      } else {
        setError(data.message || "Mã OTP không chính xác.");
      }
    } catch (err) {
      setError("Mất kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-sm bg-[#0a0a0c]/90 backdrop-blur-xl border border-gold-500/20 rounded-2xl shadow-[0_0_50px_rgba(212,175,55,0.1)] overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-gold-600 via-gold-400 to-bronze" />
        
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 bg-gold-950/40 rounded-full flex items-center justify-center border border-gold-500/20 shadow-[0_0_15px_rgba(212,175,55,0.2)] mb-4">
              {step === "email" ? (
                <Mail className="w-6 h-6 text-gold-400" />
              ) : (
                <KeyRound className="w-6 h-6 text-gold-400" />
              )}
            </div>
            <h3 className="text-xl font-black text-[#E5D5B5] font-display uppercase tracking-wider">
              {step === "email" ? "Đăng Nhập" : "Nhập Mã Xác Nhận"}
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {step === "email" 
                ? "Sử dụng email hợp lệ để nhận mã xác nhận đăng nhập."
                : `Mã 6 số đã được gửi tới ${email}`
              }
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-500/30 rounded-lg flex gap-2 items-start text-red-200 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gold-500/80 uppercase tracking-widest mb-1.5">
                  Email của bạn
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vidu@gmail.com"
                    required
                    className="w-full bg-black/40 border border-gold-500/20 text-[#E5D5B5] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold-500/60 focus:bg-black/60 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative group overflow-hidden bg-gradient-to-r from-gold-600 via-gold-500 to-bronze text-slate-950 font-black rounded-lg py-3 px-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gửi mã...</span>
                  </>
                ) : (
                  <>
                    <span>Nhận mã OTP</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gold-500/80 uppercase tracking-widest mb-1.5 text-center">
                  Nhập mã 6 số
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    required
                    pattern="[0-9]{6}"
                    className="w-full text-center tracking-[0.5em] text-xl font-mono bg-black/40 border border-gold-500/20 text-[#E5D5B5] rounded-lg px-4 py-3 focus:outline-none focus:border-gold-500/60 focus:bg-black/60 transition-all placeholder:text-slate-600/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full bg-gradient-to-r from-gold-600 via-gold-500 to-bronze text-slate-950 font-black rounded-lg py-3 px-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang kiểm tra...</span>
                  </>
                ) : (
                  <span>Hoàn tất Đăng Nhập</span>
                )}
              </button>
              
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="text-xs text-gold-500/60 hover:text-gold-400 font-semibold underline decoration-gold-500/30 underline-offset-4 transition-colors"
                >
                  Dùng email khác
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
