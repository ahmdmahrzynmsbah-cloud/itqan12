import React, { useState } from "react";
import { Lock, ShieldAlert, KeyRound } from "lucide-react";
import { translations } from "../utils/translations";

interface AdminLoginProps {
  language: "ar" | "en";
  setLanguage: (lang: "ar" | "en") => void;
  systemLogo: string;
  systemTitle: string;
  onLoginSuccess: () => void;
}

export default function AdminLogin({
  language,
  setLanguage,
  systemLogo,
  systemTitle,
  onLoginSuccess
}: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const t = translations[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError(language === "ar" ? "يرجى كتابة كلمة المرور" : "Please input password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("itqan_admin_token", data.token);
        onLoginSuccess();
      } else {
        setError(language === "ar" ? data.errorAr : data.errorEn);
      }
    } catch (err) {
      setError(language === "ar" ? "فشل الاتصال بالمخدم المركزي" : "Unable to reach database server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F5F7FA] p-4 text-[#111827]">
      {/* Top action: Language switcher outside the login box to remain extremely functional */}
      <div className="flex justify-end max-w-md mx-auto w-full pt-4">
        <button
          onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
          className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#E2E6ED] rounded-lg shadow-xs hover:bg-[#F5F7FA] transition-all cursor-pointer text-[#1A56DB] flex items-center gap-1"
          id="toggle-lang-login"
        >
          {language === "ar" ? "Switch to English 🇬🇧" : "تغيير للعربية 🇸🇦"}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center py-10">
        <div 
          className="bg-white border border-[#E2E6ED] rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] w-full max-w-md p-8 md:p-10 transition-all hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.08)]"
          id="login-card"
        >
          {/* Brand Presentation */}
          <div className="flex flex-col items-center text-center mb-8">
            <div 
              className="mb-4 text-[#1A56DB]"
              dangerouslySetInnerHTML={{ __html: systemLogo }}
            />
            <h1 className="text-2xl font-bold tracking-tight mb-2 font-cairo text-[#111827]">
              {systemTitle}
            </h1>
            <p className="text-xs text-[#6B7280] max-w-xs leading-relaxed">
              {t.loginSubtitle}
            </p>
          </div>

          {/* Alert messages if any */}
          {error && (
            <div className="mb-6 p-4 bg-[#FFF0F0] border border-[#FADBD8] rounded-xl flex items-start gap-2 text-xs text-[#C0392B]" id="login-error">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Secure passphrase Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#6B7280] mb-2" htmlFor="admin-pass">
                {t.passwordLabel}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  id="admin-pass"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border border-[#E2E6ED] rounded-xl text-center font-mono placeholder-[#9CA3AF] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#1A56DB] focus:border-[#1A56DB] transition-all bg-[#F5F7FA]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#1A56DB] hover:bg-[#1C51D3] disabled:bg-blue-300 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
              id="submit-login-button"
            >
              <KeyRound className="w-4 h-4" />
              {loading ? (language === "ar" ? "جاري التحقق..." : "Validating...") : t.loginButton}
            </button>
          </form>

          {/* Pre-configured guidance footer */}
          <div className="mt-8 pt-6 border-t border-[#E2E6ED] text-center">
            <p className="text-[10px] text-[#9CA3AF] leading-relaxed">
              {language === "ar" 
                ? "الدخول المعتمد مخصص لمشرفي النظام فقط. تم إغلاق التسجيل المفتوح التزاماً بمعايير الأمان."
                : "Authenticated access restricted to system administrative personnel. Public registration is strictly disabled."}
            </p>
          </div>
        </div>
      </div>

      {/* Humble Footer */}
      <footer className="text-center text-[11px] text-[#9CA3AF] py-2 border-t border-[#E2E6ED]/30">
        &copy; {new Date().getFullYear()} إتقان - ITQAN Systems. All rights reserved.
      </footer>
    </div>
  );
}
