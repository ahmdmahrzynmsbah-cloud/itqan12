import React, { useState, useEffect } from "react";
import { Settings, Shield, Edit3, Image, HelpCircle, KeyRound, CheckCircle2, Database, Download, Upload, AlertTriangle, Trash2, RefreshCcw, Users, Laptop, Monitor } from "lucide-react";
import { translations } from "../utils/translations";
import { SystemSettings } from "../types";

interface DashboardSettingsProps {
  language: "ar" | "en";
  setLanguage: (lang: "ar" | "en") => void;
  settings: SystemSettings;
  onSettingsUpdated: (updated: SystemSettings) => void;
  onAddLog: (actionAr: string, actionEn: string, category: "ticket" | "dispatch" | "field" | "settings" | "auth" | "system") => void;
}

export default function DashboardSettings({
  language,
  setLanguage,
  settings,
  onSettingsUpdated,
  onAddLog
}: DashboardSettingsProps) {
  const t = translations[language];

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(
        language === "ar"
          ? "تطبيق إتقان جاهز بالفعل للتثبيت على الكمبيوتر! يمكنك تثبيته بالنقر على رمز التنزيل (شاشة عليها سهم) في شريط عنوان المتصفح بالأعلى، أو من القائمة الجانبية للمتصفح -> 'حفظ ومشاركة' ثم اختر 'تثبيت الصفحة كتطبيق'."
          : "ITQAN app is ready to install! You can install it directly by clicking the install icon in your browser's address bar or menu."
      );
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  // System Settings fields
  const [titleAr, setTitleAr] = useState(settings.systemTitleAr);
  const [titleEn, setTitleEn] = useState(settings.systemTitleEn);
  const [addressAr, setAddressAr] = useState(settings.companyAddressAr || "الرياض، المملكة العربية السعودية");
  const [addressEn, setAddressEn] = useState(settings.companyAddressEn || "Riyadh, Kingdom of Saudi Arabia");
  const [phone, setPhone] = useState(settings.companyPhone || "920084729");
  const [logoSvgCode, setLogoSvgCode] = useState(settings.systemLogo);
  const [newPassword, setNewPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState<string | null>(null);

  // Backup & Reset state variables
  // Dynamic categories management state
  const [newCatAr, setNewCatAr] = useState("");
  const [newCatEn, setNewCatEn] = useState("");
  const [catsLoading, setCatsLoading] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  // Dynamic technicians management state
  const [newTechName, setNewTechName] = useState("");
  const [techsLoading, setTechsLoading] = useState(false);
  const [deletingTechName, setDeletingTechName] = useState<string | null>(null);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatAr.trim() || !newCatEn.trim()) return;

    setCatsLoading(true);
    // basic alphanumeric ID generator from English text
    const generatedId = newCatEn.trim().replace(/[^a-zA-Z0-9]/g, "");

    // Check if ID already exists
    const currentCats = settings.categories || [];
    if (currentCats.some(c => c.id.toUpperCase() === generatedId.toUpperCase())) {
      alert(language === "ar" ? "فئة الصيانة هذه موجودة بالفعل!" : "This category already exists!");
      setCatsLoading(false);
      return;
    }

    const updatedCats = [
      ...currentCats,
      { id: generatedId, nameAr: newCatAr.trim(), nameEn: newCatEn.trim() }
    ];

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: updatedCats })
      });

      if (res.ok) {
        const data = await res.json();
        onSettingsUpdated(data.settings);
        onAddLog(
          `تمت إضافة فئة صيانة جديدة بنجاح للاختيارات المتوفرة باسم عربي: [${newCatAr.trim()}] وإنجليزي: [${newCatEn.trim()}]`,
          `Successfully added new maintenance specialty options with Arabic: [${newCatAr.trim()}] and English: [${newCatEn.trim()}]`,
          "settings"
        );
        setNewCatAr("");
        setNewCatEn("");
        setNotif(language === "ar" ? "تم إضافة فئة الصيانة الجديدة بنجاح!" : "New maintenance specialty added successfully!");
        setTimeout(() => setNotif(null), 5000);
      } else {
        alert("Server failed to append category.");
      }
    } catch (err) {
      alert("Network Sync issue updating categories.");
    } finally {
      setCatsLoading(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    setCatsLoading(true);
    const updatedCats = (settings.categories || []).filter(c => c.id !== catId);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: updatedCats })
      });

      if (res.ok) {
        const data = await res.json();
        const cat = (settings.categories || []).find(c => c.id === catId);
        const catNameAr = cat ? cat.nameAr : catId;
        const catNameEn = cat ? cat.nameEn : catId;
        onSettingsUpdated(data.settings);
        onAddLog(
          `تم حذف فئة الصيانة [${catNameAr}] نهائياً من السيستم والمخزن المشترك.`,
          `Permanently removed maintenance category [${catNameEn}] from the system database store.`,
          "settings"
        );
        setDeletingCatId(null);
        setNotif(language === "ar" ? "تم حذف فئة الصيانة بنجاح." : "Maintenance category deleted successfully.");
        setTimeout(() => setNotif(null), 5000);
      } else {
        alert("Server failed to remove category.");
      }
    } catch (err) {
      alert("Network Sync issue deleting category.");
    } finally {
      setCatsLoading(false);
    }
  };

  const handleAddTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTechName.trim()) return;

    setTechsLoading(true);
    const name = newTechName.trim();
    const currentTechs = settings.technicians || [];

    if (currentTechs.some(t => t.toLowerCase() === name.toLowerCase())) {
      alert(language === "ar" ? "هذا المهندس موجود بالفعل!" : "This technician/engineer already exists!");
      setTechsLoading(false);
      return;
    }

    const updatedTechs = [...currentTechs, name];

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicians: updatedTechs })
      });

      if (res.ok) {
        const data = await res.json();
        onSettingsUpdated(data.settings);
        onAddLog(
          `تم تسجيل وإضافة مهندس صيانة جديد للسيستم باسم: [${name}]`,
          `Successfully registered and onboarded new maintenance field engineer: [${name}]`,
          "settings"
        );
        setNewTechName("");
        setNotif(language === "ar" ? "تم تسجيل المهندس الجديد بنجاح!" : "New engineer onboarded successfully!");
        setTimeout(() => setNotif(null), 5000);
      } else {
        alert("Server failed to append technician.");
      }
    } catch (err) {
      alert("Network Sync issue updating technicians.");
    } finally {
      setTechsLoading(false);
    }
  };

  const handleDeleteTechnician = async (techName: string) => {
    setTechsLoading(true);
    const updatedTechs = (settings.technicians || []).filter(t => t !== techName);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicians: updatedTechs })
      });

      if (res.ok) {
        const data = await res.json();
        onSettingsUpdated(data.settings);
        onAddLog(
          `تم حذف وإلغاء تعيين المهندس [${techName}] نهائياً من سجل الفنيين النشطين.`,
          `Permanently removed and offboarded engineer [${techName}] from standard field lists.`,
          "settings"
        );
        setDeletingTechName(null);
        setNotif(language === "ar" ? "تم حذف المهندس المعيّن بنجاح." : "Engineer deleted successfully.");
        setTimeout(() => setNotif(null), 5000);
      } else {
        alert("Server failed to delete technician.");
      }
    } catch (err) {
      alert("Network Sync issue deleting technician.");
    } finally {
      setTechsLoading(false);
    }
  };



  const handleDownloadBackup = async () => {
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Backup failed");
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "_");
      link.href = url;
      link.download = `itqan_database_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      onAddLog(
        "تم تصدير وتنزيل نسخة احتياطية كاملة ومؤمنة من قاعدة بيانات السيستم والأرشدة الحالية.",
        "System database backup successfully compiled, secured, and downloaded to local storage.",
        "system"
      );
      
      setNotif(language === "ar" ? "تم تصدير وحفظ النسخة الاحتياطية بنجاح!" : "System backup compiled & downloaded successfully!");
      setTimeout(() => setNotif(null), 5000);
    } catch (err) {
      alert(language === "ar" ? "فشل تنزيل النسخة الاحتياطية." : "Failed to compile system backup.");
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const backupData = JSON.parse(jsonContent);

        if (!backupData.tickets || !backupData.settings) {
          alert(language === "ar" ? "محتوى الملف غير صالح أو لا يدعم صيغة إتقان للنسخ الاحتياطي." : "Uploaded file lacks correct system parameters.");
          return;
        }

        const res = await fetch("/api/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: jsonContent
        });

        if (res.ok) {
          const logMsgAr = "تمت استعادة كافة البيانات الفنية وجدول الصيانة والتهيئة بنجاح من ملف النسخة الاحتياطية.";
          const logMsgEn = "Successfully restored all technical data, maintenance tables, and configurations from the backup file.";
          const newLog = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            timestamp: new Date().toISOString(),
            actionAr: logMsgAr,
            actionEn: logMsgEn,
            category: "system" as const
          };
          const currentLogs = JSON.parse(localStorage.getItem("itqan_activity_logs") || "[]");
          localStorage.setItem("itqan_activity_logs", JSON.stringify([newLog, ...currentLogs]));

          setNotif(t.dbRestoreSuccess);
          setTimeout(() => setNotif(null), 6000);
          
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          alert("Server failed to load database save.");
        }
      } catch (err) {
        alert(language === "ar" ? "فشل قراءة ملف النسخ الاحتياطي." : "Fatal error parsing backup backup payload.");
      }
    };
    reader.readAsText(file);
  };



  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotif(null);

    const payload = {
      systemTitleAr: titleAr,
      systemTitleEn: titleEn,
      systemLogo: logoSvgCode,
      companyAddressAr: addressAr,
      companyAddressEn: addressEn,
      companyPhone: phone
    };

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        onSettingsUpdated(data.settings);
        onAddLog(
          "تم تحديث الهوية البصرية للسيستم، وتعديل اسم العلامة التجارية ورفع الشعار المؤسسي الجديد.",
          "System visual white-label branding, corporate name, and custom logo updated in live memory.",
          "settings"
        );
        setNotif(t.settingsSuccess);
        setTimeout(() => setNotif(null), 5000);
      } else {
        alert("Settings update failed.");
      }
    } catch (err) {
      alert("Error synchronizing settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      alert(t.passMismatch);
      return;
    }

    setLoading(true);
    setNotif(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPasswordHash: newPassword })
      });

      if (res.ok) {
        const data = await res.json();
        onSettingsUpdated(data.settings);
        onAddLog(
          "تم تحديث كود المرور الخاص بأمان السيستم وتغيير جلسة مشرف الإدارة بنجاح.",
          "System security master access passphrase was successfully updated and synchronized.",
          "auth"
        );
        setNewPassword("");
        setNotif(language === "ar" ? "تم تفعيل كلمة المرور الجديدة بنجاح!" : "Passphrase updated successfully!");
        setTimeout(() => setNotif(null), 5000);
      } else {
        alert("Passphrase modification failed.");
      }
    } catch (err) {
      alert("Security synchronization failure.");
    } finally {
      setLoading(false);
    }
  };

  // Image/Logo file uploader processor
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith(".svg")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const svgContent = event.target?.result as string;
        // Strip off standard xml/doctype definitions to keep raw svg wrapper safe for inlining
        let processed = svgContent;
        const svgStartIndex = svgContent.indexOf("<svg");
        if (svgStartIndex !== -1) {
          processed = svgContent.substring(svgStartIndex);
        }
        setLogoSvgCode(processed);
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const imgTag = `<img src="${dataUrl}" class="w-10 h-10 object-contain rounded-lg" alt="System Logo" referrerpolicy="no-referrer" />`;
        setLogoSvgCode(imgTag);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto" id="settings-container">
      {/* Header bar */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827] flex items-center gap-2 font-cairo">
          <Settings className="w-6 h-6 text-[#1A56DB]" />
          <span>{t.settingsTitle}</span>
        </h1>
        <p className="text-xs text-[#6B7280] mt-1">{t.settingsDesc}</p>
      </div>

      {/* Settings updated alert */}
      {notif && (
        <div className="bg-[#EDFAF1] border border-[#A2E4B8] p-4 rounded-xl text-xs font-bold text-[#1A7A4A] flex items-center gap-2 animate-fade-in" id="settings-success">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{notif}</span>
        </div>
      )}

      {/* Main Settings Panel Forms split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left Column */}
        <div className="space-y-6 flex flex-col">
          {/* Form: Corporate White-Label & Branding */}
          <form onSubmit={handleSaveBranding} className="bg-white border border-[#E2E6ED] rounded-2xl p-6 shadow-xs space-y-5" id="brand-settings-form">
            <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider border-b border-[#E2E6ED] pb-3 flex items-center gap-2">
              <Image className="w-4 h-4 text-[#1A56DB]" />
              <span>{language === "ar" ? "الهوية البصرية والعلامة التجارية" : "Brand Identity Customizer"}</span>
            </h2>

            {/* Titles side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title Arabic */}
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">{t.brandTitleAr}</label>
                <input
                  type="text"
                  required
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden"
                />
              </div>

              {/* Title English */}
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">{t.brandTitleEn}</label>
                <input
                  type="text"
                  required
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Corporate Address & Contact Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Address (Ar) */}
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">
                  {language === "ar" ? "العنوان الرسمي للمؤسسة والفرع الرئيسي (عربي) *" : "HQ Official Location / Address (Arabic) *"}
                </label>
                <input
                  type="text"
                  required
                  value={addressAr}
                  onChange={(e) => setAddressAr(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden"
                />
              </div>

              {/* Address (En) */}
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">
                  {language === "ar" ? "العنوان الرسمي للمؤسسة (بالإنجليزي) *" : "HQ Official Location / Address (English) *"}
                </label>
                <input
                  type="text"
                  required
                  value={addressEn}
                  onChange={(e) => setAddressEn(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">
                {language === "ar" ? "رقم الهاتف الموحد / هاتف الدعم الفني للاتفاقية *" : "Corporate Standard Hotline / SLA Support Tel *"}
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden"
              />
            </div>

            {/* SVG logo customiser */}
            {/* Logo File Selector component */}
            <div className="p-3.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#111827]">
                    {language === "ar" ? "📁 رفع ملف شعار العلامة التجارية" : "📁 Choose Corporate Logo File"}
                  </span>
                  <span className="text-[9px] bg-[#EBF3FF] text-[#1A56DB] font-bold px-1.5 py-0.5 rounded">
                    PNG, JPG, SVG
                  </span>
                </div>
                
                <div className="flex gap-3 items-center">
                  <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#E2E6ED] hover:border-[#1A56DB] bg-white rounded-xl py-3 cursor-pointer hover:bg-blue-50/10 transition-all text-center">
                    <span className="text-xs font-bold text-[#1A56DB]">
                      {language === "ar" ? "اضغط لرفع ملف" : "Click to select file"}
                    </span>
                    <span className="text-[9px] text-gray-400 mt-0.5">
                      {language === "ar" ? "الحد الأقصى: 1 ميجابايت" : "Max limit: 1MB"}
                    </span>
                    <input
                      type="file"
                      accept=".svg,.png,.jpg,.jpeg,.gif"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Simulated preview showing real-time converted output */}
                  <div className="w-16 h-16 bg-white border border-[#E2E6ED] rounded-xl flex items-center justify-center p-1.5 overflow-hidden shrink-0 shadow-2xs">
                    {logoSvgCode ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: logoSvgCode }} 
                        className="w-full h-full flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:max-w-full [&_svg]:max-h-full [&_img]:w-full [&_img]:h-full [&_img]:object-contain" 
                      />
                    ) : (
                      <span className="text-[10px] text-gray-400">N/A</span>
                    )}
                  </div>
                </div>
              </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1A56DB] hover:bg-[#1C51D3] disabled:bg-blue-300 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{loading ? t.saving : t.saveBrandingBtn}</span>
              <span>✓</span>
            </button>
          </form>

          {/* Localization Info box */}
          <div className="bg-white border border-[#E2E6ED] rounded-2xl p-6 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
              🌍 {language === "ar" ? "اللغة الافتراضية والتبديل الجغرافي" : "Global Localizations & Translation"}
            </h3>
            <p className="text-[11px] text-[#6B7280] leading-relaxed">
              {language === "ar"
                ? "تم برمجة نظام إتقان للصيانة الميدانية ليدعم كود التوجيه التلقائي RTL/LTR بشكل متزامن. عند تغيير اللغة للعربية، يتم توجيه كامل القوائم وخانات التوثيق والصناديق تلقائياً."
                : "ITQAN uses real-time RTL/LTR bidirectionality layout rule detection. Switching language properties aligns elements layout automatically."}
            </p>
            <div className="flex gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setLanguage("ar")}
                className={`flex-1 py-2 px-3 pb-3 border rounded-xl font-bold cursor-pointer transition-all ${language === "ar" ? "bg-[#EBF3FF] border-[#1A56DB] text-[#1A56DB]" : "bg-[#F5F7FA] text-gray-400"}`}
              >
                🇸🇦 العربية (RTL)
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`flex-1 py-2 px-3 pb-3 border rounded-xl font-bold cursor-pointer transition-all ${language === "en" ? "bg-[#EBF3FF] border-[#1A56DB] text-[#1A56DB]" : "bg-[#F5F7FA] text-gray-400"}`}
              >
                🇬🇧 English (LTR)
              </button>
            </div>
          </div>

          {/* Form: Account Security password change (Left Column Bottom) */}
          <form onSubmit={handleSaveSecurity} className="bg-white border border-[#E2E6ED] rounded-2xl p-6 shadow-xs space-y-5 flex-1" id="security-settings-form">
            <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider border-b border-[#E2E6ED] pb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#1A56DB]" />
              <span>{t.profileSecurity}</span>
            </h2>

            <p className="text-[11px] text-[#6B7280] leading-relaxed">
              {language === "ar" ? "تغيير المفتاح العام للمشرف لضمان استمرار الحماية الموثقة وتقييد الوصول لصناع القرار." : "Update the primary operator key to maintain system integrity and restrict access to decision makers."}
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">{t.passwordLabel}</label>
              <input
                type="password"
                required
                placeholder={language === "ar" ? "اكتب كلمة المرور المقترحة..." : "Enter new password..."}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword.trim()}
              className="w-full py-3 bg-[#111827] hover:bg-[#1F2937] disabled:bg-gray-300 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              {loading ? t.saving : t.changePassBtn}
            </button>
          </form>
        </div>

        {/* Right Column */}
        <div className="space-y-6 flex flex-col">
          
          {/* Form: Maintenance Categories Manage */}
          <div className="bg-white border border-[#E2E6ED] rounded-2xl p-6 shadow-xs space-y-5 animate-fade-in" id="categories-settings-panel">
            <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider border-b border-[#E2E6ED] pb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-650" />
              <span>{language === "ar" ? "إدارة فئات الصيانة والتخصصات" : "Manage Maintenance Categories"}</span>
            </h2>

            <p className="text-[11px] text-[#6B7280] leading-relaxed">
              {language === "ar"
                ? "إضافة تخصصات صيانة جديدة للشركة أو حذف الفئات القديمة. ستظهر التغييرات فوراً في استمارات التكليف والتصفية الميدانية."
                : "Add new custom maintenance specialties or remove old ones. Changes propagate to client intake selections and field forms instantly."}
            </p>

            {/* List of current categories */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(settings.categories || []).map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-2.5 bg-white border border-[#E2E6ED] rounded-xl text-xs gap-3">
                  <div className="flex flex-col gap-0.5 text-right md:text-left rtl:text-right">
                    <span className="font-bold text-gray-950">{language === "ar" ? cat.nameAr : cat.nameEn}</span>
                    <span className="text-[10px] text-gray-400 font-semibold font-mono">Code: {cat.id}</span>
                  </div>
                  {deletingCatId === cat.id ? (
                    <div className="flex items-center gap-1.5 shrink-0 animate-fade-in">
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        disabled={catsLoading}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all shrink-0"
                      >
                        {language === "ar" ? "نعم، احذف" : "Yes, delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCatId(null)}
                        className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-500 rounded-lg border border-gray-200 text-[10px] font-bold cursor-pointer transition-all shrink-0"
                      >
                        {language === "ar" ? "إلغاء" : "Cancel"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeletingCatId(cat.id)}
                      disabled={catsLoading}
                      title={language === "ar" ? "حذف الفئة" : "Remove Category"}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {(settings.categories || []).length === 0 && (
                <p className="text-center text-xs text-gray-400 py-2">{language === "ar" ? "لا يوجد فئات صيانة محفوظة حالياً" : "No maintenance categories found"}</p>
              )}
            </div>

            {/* Add new category form */}
            <form onSubmit={handleAddCategory} className="border-t border-[#E2E6ED] pt-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-800">{language === "ar" ? "➕ إضافة تخصص صيانة جديد" : "➕ Add New Category"}</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-[#6B7280] mb-1">{language === "ar" ? "الاسم بالعربية *" : "Name in Arabic *"}</label>
                  <input
                    type="text"
                    required
                    placeholder={language === "ar" ? "اكتب الاسم بالعربية..." : "Enter Arabic name..."}
                    value={newCatAr}
                    onChange={(e) => setNewCatAr(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#6B7280] mb-1">{language === "ar" ? "الاسم بالإنجليزية *" : "Name in English *"}</label>
                  <input
                    type="text"
                    required
                    placeholder={language === "ar" ? "اكتب الاسم بالإنجليزية..." : "Enter English name..."}
                    value={newCatEn}
                    onChange={(e) => setNewCatEn(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={catsLoading || !newCatAr.trim() || !newCatEn.trim()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-200 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {catsLoading ? (language === "ar" ? "جاري الحفظ..." : "Processing...") : (language === "ar" ? "إضافة فئة جديدة" : "Add Specialty")}
              </button>
            </form>
          </div>

          {/* Form: Field Crew / Engineers Manage */}
          <div className="bg-white border border-[#E2E6ED] rounded-2xl p-6 shadow-xs space-y-5 animate-fade-in" id="technicians-settings-panel">
            <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider border-b border-[#E2E6ED] pb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>{language === "ar" ? "إدارة كادر المهندسين والفنيين" : "Manage Field Crew & Engineers"}</span>
            </h2>

            <p className="text-[11px] text-[#6B7280] leading-relaxed">
              {language === "ar"
                ? "يمكنك تسجيل كادر مهندسي وفنيي الشركة أو حذفهم من النظام. ستنعكس الأسماء فوراً في خيارات توجيه وتعيين المهام الميدانية."
                : "Register active field maintenance technicians and service engineers. Crew names update immediately across dispatch selectors and operations panels."}
            </p>

            {/* List of current technicians */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(settings.technicians || []).map((tech) => (
                <div key={tech} className="flex items-center justify-between p-2.5 bg-white border border-[#E2E6ED] rounded-xl text-xs gap-3">
                  <div className="flex items-center gap-2 text-right rtl:text-right">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-bold shrink-0">
                      {tech.split(" ").slice(-1)[0]?.substring(0, 1) || "م"}
                    </div>
                    <span className="font-bold text-gray-950">{tech}</span>
                  </div>
                  {deletingTechName === tech ? (
                    <div className="flex items-center gap-1.5 shrink-0 animate-fade-in">
                      <button
                        type="button"
                        onClick={() => handleDeleteTechnician(tech)}
                        disabled={techsLoading}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all shrink-0"
                      >
                        {language === "ar" ? "نعم، احذف" : "Yes, delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingTechName(null)}
                        className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-500 rounded-lg border border-gray-200 text-[10px] font-bold cursor-pointer transition-all shrink-0"
                      >
                        {language === "ar" ? "إلغاء" : "Cancel"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeletingTechName(tech)}
                      disabled={techsLoading}
                      title={language === "ar" ? "حذف المهندس" : "Remove Engineer"}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {(settings.technicians || []).length === 0 && (
                <p className="text-center text-xs text-gray-400 py-2">{language === "ar" ? "لا يوجد مهندسين أو فنيين مسجلين حالياً" : "No active field engineers registered"}</p>
              )}
            </div>

            {/* Add new technician form */}
            <form onSubmit={handleAddTechnician} className="border-t border-[#E2E6ED] pt-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-800">{language === "ar" ? "➕ تسجيل مهندس/فني ميداني جديد" : "➕ Onboard New Field Specialist"}</h3>
              
              <div>
                <label className="block text-[10px] font-semibold text-[#6B7280] mb-1">{language === "ar" ? "الاسم الكامل واللقب المهني *" : "Full Name & Professional Prefix *"}</label>
                <input
                  type="text"
                  required
                  placeholder={language === "ar" ? "اكتب الاسم الكامل..." : "Enter full name..."}
                  value={newTechName}
                  onChange={(e) => setNewTechName(e.target.value)}
                  className="w-full px-2.5 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={techsLoading || !newTechName.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-750 disabled:bg-blue-200 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {techsLoading ? (language === "ar" ? "جاري الحفظ والجدولة..." : "Registering...") : (language === "ar" ? "تسجيل وإعداد الكادر في السيستم" : "Register & Onboard Specialist")}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Unified Database Administration & Diagnostics full-width panel */}
      <div className="bg-white border border-[#E2E6ED] rounded-2xl p-6 shadow-xs space-y-6 animate-fade-in" id="db-admin-panel">
        <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider border-b border-[#E2E6ED] pb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-[#1A56DB]" />
          <span>{language === "ar" ? "أدوات صيانة قاعدة البيانات والتهيئة" : "Database Maintenance & Diagnostics"}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backup Service */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-600" />
              <span>{t.dbBackupSection}</span>
            </h3>
            <p className="text-[11px] text-[#6B7280] leading-relaxed">
              {t.dbBackupDesc}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>{t.downloadBackupBtn}</span>
              </button>

              <label className="flex-1 py-3 px-4 bg-[#F5F7FA] border border-[#E2E6ED] hover:border-blue-600 hover:bg-blue-50/10 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-center">
                <Upload className="w-4 h-4 text-gray-600" />
                <span>{t.restoreBackupBtn}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Separation line for mobile view, hidden on desktop */}
          <div className="block md:hidden border-t border-[#E2E6ED] my-2"></div>

          {/* Desktop PWA App Installation Service */}
          <div className="space-y-4 bg-slate-50/60 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-indigo-600" />
                <span>{language === "ar" ? "تثبيت النظام كبرنامج على سطح المكتب (Windows / Mac)" : "Install App on Desktop (Windows / Mac)"}</span>
              </h3>
              <p className="text-[11px] text-[#6B7280] leading-relaxed mt-2">
                {language === "ar" 
                  ? "يمكنك الآن تشغيل نظام إتقان كبرنامج مستقل ومباشر على جهاز المايكروسوفت ويندوز أو الماك دون الحاجة لفتح المتصفح، مما يمنحك أيقونة تشغيل رسمية سريعة على سطح المكتب." 
                  : "You can run the ITQAN system as a native, lightweight, standalone application on your Desktop. It bypasses web tabs and places a direct launch icon on your Windows/Mac Desktop."}
              </p>
            </div>

            <div className="space-y-3 pt-3">
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Monitor className="w-4 h-4" />
                <span>{language === "ar" ? "تنزيل وإضافة أيقونة سطح المكتب فورا" : "Install & Place Desktop Shortcut Now"}</span>
              </button>
              
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-[10px] text-slate-500 font-medium leading-normal space-y-1">
                <p className="font-bold text-slate-700">{language === "ar" ? "💡 كيف يعمل هذا التثبيت الفوري؟" : "💡 How does this work?"}</p>
                <p className="flex items-start gap-1">
                  <span>•</span>
                  <span>{language === "ar" ? "يدمج النظام مع جهازك كبرنامج رسمي متكامل (مع تشغيل فوري وتنبيهات مستقلة)." : "It integrates perfectly as a native system application with launcher shortcuts."}</span>
                </p>
                <p className="flex items-start gap-1">
                  <span>•</span>
                  <span>{language === "ar" ? "إذا كنت تستخدم Google Chrome أو Edge، اضغط على زر النجمة أو أيقونة 🖥️ في أعلى شريط العنوان." : "If using Chrome or Microsoft Edge, look for the install monitor icon 🖥️ directly in the browser's top bar."}</span>
                </p>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
