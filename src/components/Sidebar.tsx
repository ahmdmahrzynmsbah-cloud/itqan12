import React from "react";
import { 
  BarChart3, 
  Settings, 
  PhoneCall, 
  Users, 
  LogOut, 
  Globe, 
  Smartphone,
  History,
  Bell,
  Table,
  FileText,
  Briefcase,
  UserCheck
} from "lucide-react";
import { translations } from "../utils/translations";

interface SidebarProps {
  language: "ar" | "en";
  setLanguage: (lang: "ar" | "en") => void;
  systemLogo: string;
  systemTitle: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUserEmail: string;
  onLogout: () => void;
  syncStatus: boolean;
  unreadCount?: number;
  setIsNotificationOpen?: (open: boolean) => void;
}

export default function Sidebar({
  language,
  setLanguage,
  systemLogo,
  systemTitle,
  activeTab,
  setActiveTab,
  currentUserEmail,
  onLogout,
  syncStatus,
  unreadCount = 0,
  setIsNotificationOpen
}: SidebarProps) {
  const t = translations[language];

  const menuItems = [
    { id: "analytics", label: t.navAnalytics, icon: BarChart3 },
    { id: "intake", label: t.navIntake, icon: PhoneCall },
    { id: "operations", label: t.navOperations, icon: Users },
    { id: "contracts", label: t.navContracts, icon: Briefcase },
    { id: "employees", label: (t as any).navEmployees || "Staff & Docs", icon: UserCheck },
    { id: "field-simulator", label: t.navFieldPreview, icon: Smartphone },
    { id: "quotations", label: t.navQuotations || "Quotations", icon: FileText },
    { id: "reports", label: t.navReports || "Reports", icon: FileText },
    { id: "activity-log", label: t.navActivityLog, icon: History },
    { id: "settings", label: t.navSettings, icon: Settings },
  ];

  return (
    <>
      {/* Sidebar Navigation for Desktop / Large displays */}
      <aside 
        className="hidden lg:flex w-72 bg-white h-screen sticky top-0 flex-col justify-between no-print font-cairo z-30 shrink-0 border-e border-[#E2E6ED]"
        id="main-sidebar-navigation"
      >
        {/* Unified Brand Header with exact h-20 height matching the main header */}
        <div className="h-20 border-b border-[#E2E6ED] px-6 flex items-center gap-3 shrink-0">
          <div 
            className="w-10 h-10 text-[#1A56DB] flex items-center justify-center shrink-0"
            dangerouslySetInnerHTML={{ __html: systemLogo }}
          />
          <div>
            <h1 className="font-extrabold text-sm font-cairo text-[#111827] tracking-tight leading-snug">
              {systemTitle}
            </h1>
          </div>
        </div>

        {/* Scrollable Navigation section */}
        <div className="flex-1 p-6 overflow-y-auto no-scrollbar scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Navigation Items */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`sidebar-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    language === "ar" ? "text-right" : "text-left"
                  } ${
                    isActive 
                      ? "bg-[#EBF3FF] text-[#1A56DB] shadow-xs" 
                      : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F5F7FA]"
                  }`}
                >
                  <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? "text-[#1A56DB]" : "text-[#9CA3AF]"}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info & options pinned securely to the bottom */}
        <div className="p-6 bg-white space-y-4 border-t border-[#E2E6ED] shrink-0">
          
          <div className="flex items-center gap-2">
            {/* Language switch */}
            <button
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="w-full py-1.5 px-3 border border-[#E2E6ED] rounded-lg text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "English" : "عربي"}</span>
            </button>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 text-[10px] font-bold rounded-lg transition-all cursor-pointer bg-white flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.logout}</span>
          </button>
        </div>
      </aside>

      {/* Flat Mobile Header (for viewports < lg) */}
      <header 
        className="lg:hidden w-full bg-white border-b border-[#E2E6ED] px-4 py-3 sticky top-0 z-30 no-print font-cairo"
        id="main-mobile-header"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 text-[#1A56DB]"
              dangerouslySetInnerHTML={{ __html: systemLogo }}
            />
            <div>
              <h1 className="font-extrabold text-[11px] font-cairo text-[#111827]">
                {systemTitle}
              </h1>
              <span className="text-[8px] text-[#1A7A4A] font-bold">● {language === "ar" ? "مزامنة نشطة" : "Active"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="px-2 py-1 border border-[#E2E6ED] rounded-lg text-[9px] font-bold text-slate-700 bg-white cursor-pointer"
            >
              {language === "ar" ? "EN" : "AR"}
            </button>

            {setIsNotificationOpen && (
              <button
                onClick={() => setIsNotificationOpen(true)}
                className="p-1.5 border border-[#E2E6ED] rounded-lg text-slate-600 bg-white relative cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={onLogout}
              className="p-1.5 border border-rose-200 text-rose-600 rounded-lg bg-white cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Horizontal control for Mobile */}
        <div className="flex items-center gap-1 overflow-x-auto pt-2.5 mt-2.5 border-t border-[#E2E6ED]">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive 
                    ? "bg-[#EBF3FF] text-[#1A56DB] shadow-xs" 
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                <IconComponent className="w-3 h-3" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>
    </>
  );
}
