import React, { useState, useEffect } from "react";
import AdminLogin from "./components/AdminLogin";
import Sidebar from "./components/Sidebar";
import DashboardIntake from "./components/DashboardIntake";
import DashboardOperations from "./components/DashboardOperations";
import FieldWorkerPortal from "./components/FieldWorkerPortal";
import DashboardAnalytics from "./components/DashboardAnalytics";
import DashboardSettings from "./components/DashboardSettings";
import DashboardActivityLog from "./components/DashboardActivityLog";
import QuotationsModule from "./components/QuotationsModule";
import ReportBuilder from "./components/ReportBuilder";
import ContractsModule from "./components/ContractsModule";
import EmployeesModule from "./components/EmployeesModule";
import { translations } from "./utils/translations";
import { Ticket, SystemSettings } from "./types";
import { Bell, Wifi, Sparkles, LogOut, CheckCircle2, X, Trash2, Check, History, LayoutDashboard } from "lucide-react";
import { socket } from "./socket";

export default function App() {
  // Localization state
  const [language, setLanguage] = useState<"ar" | "en">("ar");

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // App Layout settings (White-labeled)
  const [settings, setSettings] = useState<SystemSettings>({
    systemTitleAr: "نظام إتقان للصيانة التشغيلية",
    systemTitleEn: "ITQAN Field Service Management",
    systemLogo: `<svg viewBox="0 0 100 100" class="w-10 h-10 text-blue-600" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="8" />
      <path d="M50 20V50L68 60" stroke="currentColor" stroke-width="6" stroke-linecap="round" />
    </svg>`,
    adminPasswordHash: "admin123",
    language: "ar",
    categories: [],
    technicians: [],
    companyAddressAr: "الرياض، المملكة العربية السعودية",
    companyAddressEn: "Riyadh, Kingdom of Saudi Arabia",
    companyPhone: "920084729"
  });

  // Incident ticket data (Central synchronized + Cached local first)
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [syncStatus, setSyncStatus] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("analytics");

  // Live Toast for incoming field updates
  const [liveToast, setLiveToast] = useState<string | null>(null);

  // Activity Log State (Loaded from localStorage)
  const [activityLogs, setActivityLogs] = useState<any[]>(() => {
    const cached = localStorage.getItem("itqan_activity_logs");
    if (cached) {
      try { return JSON.parse(cached); } catch { return []; }
    }
    return [
      {
        id: "log-seed-1",
        timestamp: new Date(Date.now() - 3600 * 1000).toISOString(),
        actionAr: "تم بدء نظام إتقان للصيانة التشغيلية بنجاح بنسبة تشغيل 100%.",
        actionEn: "ITQAN Field Service Management successfully initialized at 100% capacity.",
        category: "system"
      }
    ];
  });

  // Notifications State (Loaded from localStorage)
  const [notifications, setNotifications] = useState<any[]>(() => {
    const cached = localStorage.getItem("itqan_notifications");
    if (cached) {
      try { return JSON.parse(cached); } catch { return []; }
    }
    return [];
  });

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);

  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  // Actions Audit Session
  useEffect(() => {
    if (isAuthenticated) {
      addLog(
        "تم تسجيل دخول ناجح لمشرف النظام الكلي وتأمين الاتصال الجاري.",
        "Successful super-admin login session established and connection secured.",
        "auth"
      );
    }
  }, [isAuthenticated]);

  // Helper to add notification
  const addNotification = (text: string) => {
    const newNotif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      localStorage.setItem("itqan_notifications", JSON.stringify(updated));
      return updated;
    });
    setLiveToast(text);
  };

  // Helper to add activity log
  const addLog = (
    actionAr: string,
    actionEn: string,
    category: "ticket" | "dispatch" | "field" | "settings" | "auth" | "system"
  ) => {
    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      actionAr,
      actionEn,
      category
    };
    setActivityLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem("itqan_activity_logs", JSON.stringify(updated));
      return updated;
    });

    // Automatically send notification of this event only for important categories
    const importantCategories = ["dispatch", "field"];
    if (importantCategories.includes(category)) {
      const textNotif = language === "ar" ? actionAr : actionEn;
      const newNotif = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        text: textNotif,
        timestamp: new Date().toISOString(),
        read: false
      };
      setNotifications(prev => {
        const updated = [newNotif, ...prev];
        localStorage.setItem("itqan_notifications", JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleClearLogs = () => {
    setActivityLogs([]);
    localStorage.removeItem("itqan_activity_logs");
    setTimeout(() => {
      addLog(
        "تمت تصفية سجل المعاملات والعمليات نهائياً وتهيئة سجل نظيف وجديد للتدقيق.",
        "System transaction log database was entirely cleared; initialized a fresh audit trail.",
        "system"
      );
    }, 50);
  };

  const markAllNotificationsAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem("itqan_notifications", JSON.stringify(updated));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    localStorage.removeItem("itqan_notifications");
  };

  const handleMarkOneNotificationAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    localStorage.setItem("itqan_notifications", JSON.stringify(updated));
  };

  // URL Query Parameters Detection: allows field worker mobile directly without admin log block
  const [isFieldBypassMode, setIsFieldBypassMode] = useState<boolean>(false);
  const [bypassTicketId, setBypassTicketId] = useState<string | null>(null);

  // Current session user context
  const currentUserEmail = "operator.admin@itqan.co";

  // Parse direct bypass URL parameters on creation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const portalType = urlParams.get("portal");
    const idParam = urlParams.get("id");

    if (portalType === "field") {
      setIsFieldBypassMode(true);
      setBypassTicketId(idParam);
    }

    // Load initial token authorization status
    const cachedToken = localStorage.getItem("itqan_admin_token");
    if (cachedToken === "itqan-admin-token-secure-hybrid") {
      setIsAuthenticated(true);
    }
  }, []);

  // background contract alert triggers for site visit schedules and expiration checks
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkContractAlerts = async () => {
      try {
        const res = await fetch("/api/contracts");
        if (!res.ok) return;
        const contractsList = await res.json();
        const todayStr = new Date().toISOString().split("T")[0];

        const storedNotified = localStorage.getItem("itqan_notified_events");
        let notifiedEvents: Record<string, boolean> = {};
        if (storedNotified) {
          try { notifiedEvents = JSON.parse(storedNotified); } catch { notifiedEvents = {}; }
        }

        let hasNewNotifications = false;

        contractsList.forEach((c: any) => {
          if (c.status !== "Active") return;

          // 1. Routine visit due check
          if (c.nextVisitDate && c.nextVisitDate <= todayStr) {
            const eventKey = `visit-${c.id}-${c.nextVisitDate}`;
            if (!notifiedEvents[eventKey]) {
              const msgAr = `🔔 موعد زيارة موقع العقد اليوم للعميل: [${c.customerName}] (${c.contractType})`;
              const msgEn = `🔔 Routine site visit is due today for: [${c.customerName}] (${c.contractType})`;
              addNotification(language === "ar" ? msgAr : msgEn);
              notifiedEvents[eventKey] = true;
              hasNewNotifications = true;
            }
          }

          // 2. Expiration soon alert
          if (c.endDate) {
            const diffTime = new Date(c.endDate).getTime() - new Date(todayStr).getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

            if (diffDays >= 0 && diffDays <= 30) {
              const eventKey = `expiry-${c.id}-${c.endDate}`;
              if (!notifiedEvents[eventKey]) {
                const msgAr = `⚠️ العقد رقم ${c.id} للعميل: [${c.customerName}] يوشك على الانتهاء خلال ${diffDays} يوم بتاريخ ${c.endDate}`;
                const msgEn = `⚠️ Contract ${c.id} for [${c.customerName}] is about to expire in ${diffDays} days on ${c.endDate}`;
                addNotification(language === "ar" ? msgAr : msgEn);
                notifiedEvents[eventKey] = true;
                hasNewNotifications = true;
              }
            }
          }
        });

        if (hasNewNotifications) {
          localStorage.setItem("itqan_notified_events", JSON.stringify(notifiedEvents));
        }
      } catch (err) {
        console.error("System scheduling worker: failed contract checks", err);
      }
    };

    // run initially and then check every 10 minutes
    checkContractAlerts();
    const timer = setInterval(checkContractAlerts, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, [isAuthenticated, language]);

  const changeLanguage = (lang: "ar" | "en") => {
    setLanguage(lang);
    addLog(
      lang === "ar" ? "تم تحويل لغة واجهة السيستم وتخطيط الاتجاهات لتصبح العربية." : "تم تحويل لغة واجهة النظام وتحديث الاتجاهات لتصبح الإنجليزية.",
      lang === "ar" ? "UI layout alignment shifted and language updated to Arabic." : "System localization updated and language switched to English.",
      "system"
    );
  };

  // Set document text direction and body styles on language toggle
  useEffect(() => {
    const dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", language);
    // Align CSS font classes
    document.body.style.direction = dir;
    document.body.style.fontFamily = language === "ar" ? "'Cairo', sans-serif" : "'Inter', sans-serif";
  }, [language]);

  // Load static system configurations
  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        if (data.language) {
          setLanguage(data.language);
        }
      })
      .catch(err => console.warn("Primary database config server is offline, using offline seed preferences", err));

    socket.on("settingsUpdated", (newSettings) => {
      setSettings(newSettings);
      if (newSettings.language) {
        setLanguage(newSettings.language);
      }
    });

    return () => {
      socket.off("settingsUpdated");
    };
  }, []);

  // Synchronize Ticket data + Cached local-first fallback
  useEffect(() => {
    const cached = localStorage.getItem("itqan_tickets_cache");
    if (cached) {
      try {
        setTickets(JSON.parse(cached));
      } catch (e) {
        console.error("Corrupted local cache ledger", e);
      }
    }

    // 2. Load centralized server information
    const processLatestTickets = (latestTickets: Ticket[]) => {
      // Compare if tickets was modified (e.g., check for new reports for immediate live stream alerts)
      if (tickets.length > 0) {
        latestTickets.forEach(latest => {
          const old = tickets.find(o => o.id === latest.id);
          if (old && old.status !== latest.status) {
            // Status changed in database!
            const mapAr: any = { Pending: "قيد الانتظار", Assigned: "تم الإسناد", "In Progress": "جاري التحرك والبدء", "In QA Review": "مراجعة الجودة ومطابقة العمل", Closed: "مغلق نهائياً" };
            const mapEn: any = { Pending: "Pending Dispatch", Assigned: "Assigned", "In Progress": "Work In Progress", "In QA Review": "Quality Review", Closed: "Closed & Archived" };
            const stAr = mapAr[latest.status] || latest.status;
            const stEn = mapEn[latest.status] || latest.status;
            
            // Log this activity and trigger a notification
            const pathAr = `تحديث تلقائي: تغيرت حالة البلاغ [${latest.id}] لـ [${latest.customerName}] لتصبح: [${stAr}] من خلال البوابة.`;
            const pathEn = `Auto Sync: Incident [${latest.id}] for [${latest.customerName}] shifted to status [${stEn}] from portal.`;
            
            // Add directly to notification and logs state
            setActivityLogs(prev => {
              const exists = prev.some(item => item.timestamp === latest.fieldReport?.reportTimestamp);
              if (exists) return prev;
              const newLog = {
                id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                timestamp: new Date().toISOString(),
                actionAr: pathAr,
                actionEn: pathEn,
                category: "field" as const
              };
              const updated = [newLog, ...prev];
              localStorage.setItem("itqan_activity_logs", JSON.stringify(updated));
              return updated;
            });
            
            setNotifications(prev => {
              const newNotif = {
                id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                text: language === "ar" ? pathAr : pathEn,
                timestamp: new Date().toISOString(),
                read: false
              };
              const updated = [newNotif, ...prev];
              localStorage.setItem("itqan_notifications", JSON.stringify(updated));
              return updated;
            });

            setLiveToast(language === "ar" ? pathAr : pathEn);
            setTimeout(() => setLiveToast(null), 7000);
          }
        });
      }

      setTickets(latestTickets);
      localStorage.setItem("itqan_tickets_cache", JSON.stringify(latestTickets));
      setSyncStatus(true);
    };

    const fetchPrimaryDb = () => {
      fetch("/api/tickets")
        .then(res => {
          if (!res.ok) throw new Error("API failed");
          return res.json();
        })
        .then(processLatestTickets)
        .catch(err => {
          console.warn("Centralized cloud backend offline. Standard operational loop maintains cached values.", err);
          setSyncStatus(true);
        });
    };

    fetchPrimaryDb();
    
    socket.on("ticketsUpdated", processLatestTickets);
    
    return () => {
      socket.off("ticketsUpdated");
    };
  }, [tickets.length, language]);

  // Logout handler
  const handleLogout = () => {
    addLog(
      "تم تسجيل خروج مشرف النظام بنجاح وتصفير جلسة العمل الحالية المقترنة.",
      "Operator super-admin successfully logged out and terminated the active security session.",
      "auth"
    );
    localStorage.removeItem("itqan_admin_token");
    setIsAuthenticated(false);
  };

  // Safe callback handlers
  const handleTicketCreated = (newTicket: Ticket) => {
    // Inject directly into state & local cache for instant feedback
    const nextTickets = [newTicket, ...tickets];
    setTickets(nextTickets);
    localStorage.setItem("itqan_tickets_cache", JSON.stringify(nextTickets));

    const pathAr = `تم تسجيل بلاغ صيانة جديد للعميل [${newTicket.customerName}] بقسم (${newTicket.category}) بنجاح بمستوى أهمية [${newTicket.priority}].`;
    const pathEn = `Logged new client incident for [${newTicket.customerName}] of category (${newTicket.category}) with priority severity [${newTicket.priority}].`;
    addLog(pathAr, pathEn, "ticket");
  };

  const handleTicketUpdated = (revisedTicket: Ticket) => {
    const oldTicket = tickets.find(t => t.id === revisedTicket.id);
    const nextTickets = tickets.map(t => t.id === revisedTicket.id ? revisedTicket : t);
    setTickets(nextTickets);
    localStorage.setItem("itqan_tickets_cache", JSON.stringify(nextTickets));

    if (oldTicket) {
      if (oldTicket.assignedTechnician !== revisedTicket.assignedTechnician) {
        const tAr = revisedTicket.assignedTechnician || "غير معين";
        const tEn = revisedTicket.assignedTechnician || "Unassigned";
        addLog(
          `تم توزيع التكليف الميداني للتذكرة [${revisedTicket.id}] وإرسال المهمة للمهندس الفني [${tAr}] للمتابعة.`,
          `Dispatched Ticket [${revisedTicket.id}] to Field Service Technical Specialist [${tEn}] on system.`,
          "dispatch"
        );
      } else if (oldTicket.status !== revisedTicket.status) {
        const statusesAr: any = { Pending: "قيد التشغيل والانتظار", Assigned: "تم الإسناد والجدولة", "In Progress": "جاري التحرك والإصلاح الميداني", "In QA Review": "مراجعة الجودة ومطابقة العمل", Closed: "مغلق ومكتمل" };
        const statusesEn: any = { Pending: "Pending Dispatch", Assigned: "Assigned", "In Progress": "Work In Progress", "In QA Review": "QA Quality Review", Closed: "Closed & Validated" };
        const stAr = statusesAr[revisedTicket.status] || revisedTicket.status;
        const stEn = statusesEn[revisedTicket.status] || revisedTicket.status;
        addLog(
          `تم تحديث مرحلة تذكرة العمل رقم [${revisedTicket.id}] بنجاح لتصبح (${stAr}) الآن.`,
          `Transitioned workflow of Ticket [${revisedTicket.id}] to status phase (${stEn}).`,
          "field"
        );
      } else {
        addLog(
          `تم مراجعة وتعديل بيانات التذكرة التشغيلية رقم [${revisedTicket.id}].`,
          `Modified information and fields for operational Ticket [${revisedTicket.id}].`,
          "ticket"
        );
      }
    }
  };

  const handleTicketDeleted = (id: string) => {
    const nextTickets = tickets.filter(t => t.id !== id);
    setTickets(nextTickets);
    localStorage.setItem("itqan_tickets_cache", JSON.stringify(nextTickets));
    addLog(
      `تم حذف تذكرة العمل رقم [${id}] نهائياً من نظام خدمة العملاء والتشغيل.`,
      `Successfully deleted work ticket [${id}] permanently from client-intake & scheduling.`,
      "ticket"
    );
  };

  const currentSystemTitle = language === "ar" ? settings.systemTitleAr : settings.systemTitleEn;

  // Direct Bypass mode render
  if (isFieldBypassMode) {
    return (
      <div className="bg-[#F5F7FA] min-h-screen">
        <FieldWorkerPortal
          language={language}
          ticketIdFromUrl={bypassTicketId}
          onRefreshAll={() => {
            // Re-fetch in background
            fetch("/api/tickets")
              .then(res => res.json())
              .then(latest => setTickets(latest))
              .catch(err => console.error(err));
          }}
        />
      </div>
    );
  }

  // Access Auth Gate for admins
  if (!isAuthenticated) {
    return (
      <AdminLogin
        language={language}
        setLanguage={changeLanguage}
        systemLogo={settings.systemLogo}
        systemTitle={currentSystemTitle}
        onLoginSuccess={() => setIsAuthenticated(true)}
      />
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col lg:flex-row bg-[#F5F7FA] font-sans relative" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Interactive global system notifications */}
      {liveToast && (
        <div 
          className="fixed bottom-5 right-5 left-5 md:left-auto md:max-w-md bg-[#111827] text-white p-4 rounded-2xl shadow-2xl z-50 flex items-center justify-between border border-blue-500/30 animate-fade-in"
          id="realtime-toast"
        >
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
            <p className="text-xs font-bold font-cairo leading-relaxed">{liveToast}</p>
          </div>
          <button 
            onClick={() => setLiveToast(null)}
            className="text-gray-400 hover:text-white px-2 py-1 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Interactive Slideway Notification Drawer */}
      {isNotificationOpen && (
        <>
          {/* Backdrop screen mask */}
          <div 
            className="fixed inset-0 bg-black/45 backdrop-blur-xs z-40 transition-opacity no-print"
            onClick={() => setIsNotificationOpen(false)}
          />
          
          {/* Notifications Drawer */}
          <div 
            className={`fixed inset-y-0 ${language === "ar" ? "left-0 border-r" : "right-0 border-l"} w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col justify-between transition-transform duration-300 ease-out no-print`}
            id="notifications-side-drawer"
            dir={language === "ar" ? "rtl" : "ltr"}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E2E6ED] flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#1A56DB]" />
                <h3 className="font-black text-sm text-[#111827] font-cairo">
                  {language === "ar" ? "إشعارات النظام والربط الحية" : "Service & Operations Alerts"}
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {unreadCount} {language === "ar" ? "جديد" : "New"}
                  </span>
                )}
              </div>
              <button 
                onClick={() => setIsNotificationOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick action utility bar */}
            <div className="px-5 py-2.5 bg-[#F5F7FA] border-b border-[#E2E6ED] flex justify-between items-center text-[10px] font-bold text-gray-500 shrink-0">
              <button 
                onClick={markAllNotificationsAsRead}
                className="hover:text-[#1A56DB] transition-all flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{language === "ar" ? "تحديد الكل كمقروء" : "Mark all as read"}</span>
              </button>
              <button 
                onClick={clearAllNotifications}
                className="hover:text-rose-600 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === "ar" ? "حذف كافة التنبيهات" : "Log out / Wipe list"}</span>
              </button>
            </div>

            {/* Notification items roll */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
              {notifications.length === 0 ? (
                <div className="text-center py-24 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-gray-400 mx-auto">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-gray-600 font-cairo">
                    {language === "ar" ? "سجل التنبيهات فارغ بالكامل" : "No active alerts in queue"}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {language === "ar" 
                      ? "سيتم استلام الإشعارات الميدانية والتغييرات تلقائياً وبثها لك ثانية بثانية." 
                      : "Real-time ticket state modifications and specialist logs will stream here."}
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => handleMarkOneNotificationAsRead(notif.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                      notif.read 
                        ? "bg-white border-[#E2E6ED] opacity-75" 
                        : "bg-[#EBF3FF]/40 border-blue-200/60 shadow-2xs hover:border-[#1A56DB]/50"
                    }`}
                  >
                    {/* Unread dot bar */}
                    {!notif.read && (
                      <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    )}
                    
                    <div className="space-y-1.5 pr-2.5">
                      <p className={`text-xs text-[#111827] leading-relaxed font-cairo ${!notif.read ? "font-bold" : "font-medium text-slate-600"}`}>
                        {notif.text}
                      </p>
                      <div className="flex justify-between items-center text-[9px] text-[#A55EEA] font-mono">
                        <span>
                          ⏱️ {new Date(notif.timestamp).toLocaleTimeString(language === "ar" ? "ar-EG" : "en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                          })}
                        </span>
                        {!notif.read && (
                          <span className="text-[8px] bg-[#EBF3FF] text-[#1A56DB] px-1.5 py-0.5 rounded font-bold uppercase">
                            {language === "ar" ? "جديد" : "New"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer display info */}
            <div className="p-4 border-t border-[#E2E6ED] bg-slate-50 text-[9px] text-gray-400 text-center font-semibold uppercase tracking-wider">
              🛡️ {language === "ar" ? "الاتصال بالمخدم مؤمن حراً" : "Encrypted System Broadcast Pipe"}
            </div>
          </div>
        </>
      )}

      {/* Primary Sidebar navigation */}
      <Sidebar
        language={language}
        setLanguage={changeLanguage}
        systemLogo={settings.systemLogo}
        systemTitle={currentSystemTitle}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUserEmail={currentUserEmail}
        syncStatus={syncStatus}
        onLogout={handleLogout}
        unreadCount={unreadCount}
        setIsNotificationOpen={setIsNotificationOpen}
      />

      {/* Central Screen Assembly */}
      <div className="flex-1 flex flex-col min-w-0" id="dashboard-workspace-body">

        {/* Dynamic White-Label Brand Top Header */}
        <header className="hidden lg:flex h-20 bg-white border-b border-[#E2E6ED] px-6 items-center justify-between shrink-0 no-print sticky top-0 z-20">
          <div></div>
          {/* Header actions: Live State & Notifications bell */}
          <div className="flex items-center gap-3">
            {/* Live operational state badge on large monitors */}
            <div className="hidden md:flex items-center gap-1.5 text-[10px] text-[#1A7A4A] bg-[#EDFAF1] px-2.5 py-1 rounded-lg font-bold border border-[#1A7A4A]/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1A7A4A] animate-pulse"></span>
              <span>{language === "ar" ? "خوادم الربط والمزامنة حية" : "Cloud Data Sync Node Active"}</span>
            </div>

            {/* Notification center trigger */}
            <button
              onClick={() => setIsNotificationOpen(true)}
              className="relative p-2.5 text-gray-500 hover:text-[#1A56DB] hover:bg-slate-50 border border-[#E2E6ED] rounded-xl transition-all cursor-pointer bg-white"
              title={language === "ar" ? "مركز الإشعارات الحية" : "Notifications center"}
              id="header-notification-bell"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Main Dashboard Panel workspace */}
        <main className={`flex-1 min-w-0 ${activeTab === "reports" ? "p-0 h-full overflow-hidden flex flex-col" : "p-6 md:p-8 overflow-y-auto"}`} id="main-content-panel">
          
          {/* Tab router views wrapper */}
          <div className={`animate-fade-in ${activeTab === "reports" ? "h-full flex flex-col" : ""}`}>
            {activeTab === "analytics" && (
              <DashboardAnalytics
                language={language}
                tickets={tickets}
                categories={settings.categories}
                technicians={settings.technicians}
                onAddLog={addLog}
              />
            )}

            {activeTab === "intake" && (
              <DashboardIntake
                language={language}
                tickets={tickets}
                onTicketCreated={handleTicketCreated}
                onTicketUpdated={handleTicketUpdated}
                onTicketDeleted={handleTicketDeleted}
                categories={settings.categories}
                technicians={settings.technicians}
                onAddLog={addLog}
              />
            )}

            {activeTab === "operations" && (
              <DashboardOperations
                language={language}
                tickets={tickets}
                onTicketUpdated={handleTicketUpdated}
                onTicketDeleted={handleTicketDeleted}
                onOpenFieldPortalSimulator={(id) => {
                  // Instantly open field portal simulator tab with parameter
                  setBypassTicketId(id);
                  setIsFieldBypassMode(true);
                }}
                categories={settings.categories}
                technicians={settings.technicians}
                onAddLog={addLog}
              />
            )}

            {activeTab === "field-simulator" && (
              <div className="p-4 bg-white border border-[#E2E6ED] rounded-2xl shadow-xs space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-[#111827] font-cairo">
                    {language === "ar" ? "رابط ومحاكي بوابة الفني الميدانية" : "Field Specialist Smart Simulator"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === "ar"
                      ? "يمكنك استخدام هذا المحاكي الداخلي لتجربة إدخال تقارير الصيانة والتواقيع وتغيير الحالات فورياً."
                      : "Simulate real smartphone views to test Before/After uploads, completion files and customer signatures."}
                  </p>
                </div>

                {/* Display full-height embedded mock */}
                <div className="bg-[#F8F9FC] border border-[#E2E6ED] rounded-xl overflow-hidden p-3 max-w-md mx-auto">
                  <div className="bg-gray-800 text-white rounded-t-3xl p-3 pb-1.5 flex justify-between items-center text-[10px] font-mono">
                    <span>🔋 98%</span>
                    <span className="font-bold">📱 ITQAN MOBILE MOCK</span>
                    <span>📶 5G</span>
                  </div>
                  <div className="bg-white border-x border-b border-gray-300 rounded-b-3xl overflow-hidden h-[540px] overflow-y-auto">
                    <FieldWorkerPortal
                      language={language}
                      ticketIdFromUrl={bypassTicketId}
                      onRefreshAll={() => {
                        fetch("/api/tickets")
                          .then(res => res.json())
                          .then(latest => setTickets(latest))
                          .catch(err => console.error(err));
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "activity-log" && (
              <DashboardActivityLog
                language={language}
                logs={activityLogs}
                onClearLogs={handleClearLogs}
              />
            )}

            {activeTab === "quotations" && (
              <QuotationsModule language={language} />
            )}

            {activeTab === "contracts" && (
              <ContractsModule
                language={language}
                addLog={addLog}
                addNotification={addNotification}
                settings={settings}
              />
            )}

            {activeTab === "employees" && (
              <EmployeesModule
                language={language}
                addLog={addLog}
                addNotification={addNotification}
              />
            )}

            {activeTab === "reports" && (
              <ReportBuilder language={language} settings={settings} />
            )}

            {activeTab === "settings" && (
              <DashboardSettings
                language={language}
                setLanguage={changeLanguage}
                settings={settings}
                onSettingsUpdated={(updated: SystemSettings) => {
                  setSettings(updated);
                }}
                onAddLog={addLog}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
