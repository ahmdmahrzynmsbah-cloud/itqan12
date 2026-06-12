import React, { useState } from "react";
import { ActivityLogItem } from "../types";
import { Trash2, Search, Filter, RefreshCw, Layers, Shield, FileText, Pocket, Settings, Activity } from "lucide-react";

interface DashboardActivityLogProps {
  language: "ar" | "en";
  logs: ActivityLogItem[];
  onClearLogs: () => void;
}

export default function DashboardActivityLog({
  language,
  logs,
  onClearLogs
}: DashboardActivityLogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [confirmingClear, setConfirmingClear] = useState(false);

  const isAr = language === "ar";

  // Filter logs based on search and category filter
  const filteredLogs = logs.filter(log => {
    const textToSearch = (isAr ? log.actionAr : log.actionEn).toLowerCase();
    const matchesSearch = textToSearch.includes(searchTerm.toLowerCase()) || 
                          log.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "All" || log.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Get color and icon based on log category
  const getCategoryMeta = (category: string) => {
    switch (category) {
      case "ticket":
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-100",
          icon: FileText,
          label: isAr ? "بلاغات العملاء" : "Customer Intake"
        };
      case "dispatch":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-100",
          icon: RefreshCw,
          label: isAr ? "الجدولة والتوزيع" : "Scheduling & Dispatch"
        };
      case "field":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
          icon: Pocket,
          label: isAr ? "الفني الميداني" : "Field Specialist"
        };
      case "settings":
        return {
          bg: "bg-purple-50 text-purple-700 border-purple-100",
          icon: Settings,
          label: isAr ? "الهوية والعلامة" : "White-Label & Branding"
        };
      case "auth":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-100",
          icon: Shield,
          label: isAr ? "الحماية والولوج" : "Security & Authentication"
        };
      default:
        return {
          bg: "bg-slate-50 text-slate-700 border-slate-100",
          icon: Activity,
          label: isAr ? "خادم النظام" : "System Server"
        };
    }
  };

  const handleClearClick = () => {
    if (!confirmingClear) {
      setConfirmingClear(true);
      setTimeout(() => setConfirmingClear(false), 5000);
    } else {
      onClearLogs();
      setConfirmingClear(false);
    }
  };

  return (
    <div className="space-y-6" id="activity-log-view">
      {/* View Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#E2E6ED] pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-[#111827] flex items-center gap-2 font-cairo">
            <Activity className="w-6 h-6 text-[#1A56DB]" />
            <span>{isAr ? "سجل النشاط المباشر والعمليات" : "Live Activity & System Audit Log"}</span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            {isAr 
              ? "سجل إلكتروني تتابعي غير قابل للتلاعب يرصد كافة مدخلات الكول سنتر وإسناد التذاكر والتقارير المكتملة وتغييرات الهوية."
              : "An unalterable sequential log recording all customer dispatching, field report filings, and structural updates."}
          </p>
        </div>

        {/* Audit clear controller */}
        <button
          onClick={handleClearClick}
          className={`px-4 py-2.5 transition-all cursor-pointer flex items-center gap-2 rounded-xl text-xs font-bold border ${
            confirmingClear 
              ? "bg-red-600 border-red-700 text-white animate-pulse hover:bg-red-700" 
              : "bg-rose-50 text-rose-700 hover:bg-rose-100/80 border-rose-200 hover:border-rose-300"
          }`}
          id="btn-clear-activity"
        >
          <Trash2 className="w-4 h-4" />
          <span>
            {confirmingClear 
              ? (isAr ? "⚠️ تأكيد الحذف النهائي؟" : "⚠️ Click again to Erase") 
              : (isAr ? "إعادة تعيين سجل الأنشطة والعمليات" : "Reset / Clear System Log")
            }
          </span>
        </button>
      </div>

      {/* Info Stats block */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="log-stats">
        <div className="bg-white border border-[#E2E6ED] p-4 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">
              {isAr ? "إجمالي الأنشطة المسجلة" : "Total Logged Actions"}
            </span>
            <span className="text-2xl font-black text-[#111827] font-mono leading-none block">
              {logs.length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#1A56DB]">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E6ED] p-4 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">
              {isAr ? "نتائج تصفية البحث" : "Filtered Matches"}
            </span>
            <span className="text-2xl font-black text-amber-600 font-mono leading-none block">
              {filteredLogs.length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <Search className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E6ED] p-4 rounded-2xl flex items-center justify-between col-span-1">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">
              {isAr ? "حالة ربط خادوم المراجعة" : "Audit Server Mode"}
            </span>
            <span className="text-xs font-bold text-[#1A7A4A] bg-[#EDFAF1] px-2 py-0.5 rounded uppercase tracking-wider inline-block">
              {isAr ? "نشط - حماية مشفرة" : "Active & Sealed"}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and search utilities */}
      <div className="bg-white p-4 border border-[#E2E6ED] rounded-2xl flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={isAr ? "ابحث بنص العملية، برقم التذكرة أو الفئة..." : "Search action text, code or stream..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden"
          />
          <span className="absolute left-2.5 top-3.5 text-[#9CA3AF]">
            <Search className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Category filtering dropdown */}
        <div className="w-full md:w-56">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:outline-hidden font-semibold"
          >
            <option value="All">{isAr ? "كل أقسام العمليات" : "All System Sectors"}</option>
            <option value="ticket">{isAr ? "بلاغات العملاء (Intake)" : "Customer Intake"}</option>
            <option value="dispatch">{isAr ? "الجدولة والتوزيع (Ops)" : "Scheduling & Dispatch"}</option>
            <option value="field">{isAr ? "الأعمال الميدانية (Tech)" : "Field Specialist"}</option>
            <option value="settings">{isAr ? "إعدادات الهوية والتخصيص" : "Brand Customization"}</option>
            <option value="auth">{isAr ? "عمليات الحماية والدخول" : "Security & Auth"}</option>
            <option value="system">{isAr ? "خادم السيستم والمخرجات" : "System Server Core"}</option>
          </select>
        </div>
      </div>

      {/* Logs interactive list or Empty view */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white border border-[#E2E6ED] rounded-2xl p-16 text-center space-y-3">
          <div className="w-12 h-12 bg-[#F5F7FA] rounded-full flex items-center justify-center text-gray-400 mx-auto">
            <Filter className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-[#111827]">
            {isAr ? "لا توجد تفاعلات أو أنشطة تطابق تصفيتك الحالية" : "No logs matching current filter parameters"}
          </p>
          <p className="text-xs text-[#6B7280]">
            {isAr ? "يرجى تعديل الكلمات البحثية الخاصة بك أو تبديل فئة العمليات لعرض السجل." : "Alter your keywords or reset selection to inspect audit log."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E6ED] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#E2E6ED] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                  <th className="p-4 text-center w-20">{isAr ? "م" : "Ref"}</th>
                  <th className="p-4 w-40">{isAr ? "التاريخ والوقت" : "Timestamp"}</th>
                  <th className="p-4 w-44">{isAr ? "فئة الإجراء" : "Sector"}</th>
                  <th className="p-4">{isAr ? "تفاصيل الإجراء والمهمة" : "Logged Event Description"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6ED] text-xs">
                {filteredLogs.map((log, index) => {
                  const meta = getCategoryMeta(log.category);
                  const Icon = meta.icon;
                  return (
                    <tr key={log.id} className="hover:bg-[#F5F7FA]/40 transition-colors">
                      {/* Counter index */}
                      <td className="p-4 font-mono font-bold text-[#9CA3AF] text-center">
                        {filteredLogs.length - index}
                      </td>

                      {/* Accurate timestamp */}
                      <td className="p-4 font-mono text-slate-800 font-medium whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })}
                      </td>

                      {/* Level / Category Badge */}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 border rounded-lg text-[10px] font-bold flex items-center gap-1.5 w-fit ${meta.bg}`}>
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{meta.label}</span>
                        </span>
                      </td>

                      {/* Human translated Action Event */}
                      <td className="p-4 text-[#111827] font-semibold font-cairo leading-relaxed">
                        {isAr ? log.actionAr : log.actionEn}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
