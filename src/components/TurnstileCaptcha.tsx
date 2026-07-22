import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ShieldCheck, RefreshCw } from "lucide-react";

interface TurnstileCaptchaProps {
  onVerify: (verified: boolean) => void;
  resetTrigger?: number;
}

export default function TurnstileCaptcha({ onVerify, resetTrigger }: TurnstileCaptchaProps) {
  const [status, setStatus] = useState<"idle" | "verifying" | "success">("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (resetTrigger) {
      setStatus("idle");
      setProgress(0);
    }
  }, [resetTrigger]);

  useEffect(() => {
    if (progress >= 100 && status === "verifying") {
      setStatus("success");
      onVerify(true);
    }
  }, [progress, status, onVerify]);

  const handleCheckboxClick = () => {
    if (status !== "idle") return;
    
    setStatus("verifying");
    setProgress(0);

    // Simulate verification progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 15;
      });
    }, 150);
  };

  return (
    <div className="relative overflow-hidden w-full max-w-sm mx-auto p-4 rounded-xl border border-gold-500/15 bg-black/80 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.6)] transition-all duration-300">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Custom Checkbox */}
          <button
            id="captcha-checkbox-btn"
            type="button"
            onClick={handleCheckboxClick}
            className={`relative flex items-center justify-center w-7 h-7 rounded-md border transition-all duration-300 focus:outline-none cursor-pointer ${
              status === "success"
                ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                : status === "verifying"
                ? "bg-black border-gold-500"
                : "bg-[#0c0c0e] border-gold-500/30 hover:border-gold-500 text-transparent"
            }`}
          >
            <AnimatePresence mode="wait">
              {status === "success" && (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </motion.div>
              )}
              {status === "verifying" && (
                <motion.div
                  key="loading"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="text-gold-400"
                >
                  <RefreshCw className="w-4 h-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Label */}
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-200">
              {status === "success" && "Xác minh thành công"}
              {status === "verifying" && `Đang xác minh bảo mật...`}
              {status === "idle" && "Xác minh tôi là con người"}
            </span>
            <span className="text-[9px] text-gold-400/60 font-mono tracking-widest uppercase">
              Cloudflare Turnstile Protected
            </span>
          </div>
        </div>

        {/* Brand logo / Shield */}
        <div className="flex flex-col items-end opacity-85">
          <ShieldCheck className={`w-6 h-6 ${status === "success" ? "text-emerald-400" : "text-gold-400"} transition-colors duration-300`} />
          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Anti-Bot</span>
        </div>
      </div>

      {/* Verification progress bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-[#0c0c0e] w-full">
        <div
          className={`h-full transition-all duration-150 ${
            status === "success" ? "bg-emerald-500" : "bg-gradient-to-r from-gold-600 via-gold-500 to-bronze"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
