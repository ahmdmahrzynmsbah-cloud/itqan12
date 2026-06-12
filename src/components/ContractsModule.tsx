import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { 
  Briefcase, 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Check, 
  Edit3, 
  X, 
  FileText,
  Activity,
  UserCheck,
  Printer
} from "lucide-react";
import { translations } from "../utils/translations";
import { Contract, SystemSettings } from "../types";
import { socket } from "../socket";

interface ContractsModuleProps {
  language: "ar" | "en";
  addLog: (ar: string, en: string, category: "ticket" | "dispatch" | "field" | "settings" | "auth" | "system") => void;
  addNotification: (text: string) => void;
  settings: SystemSettings;
}

export default function ContractsModule({
  language,
  addLog,
  addNotification,
  settings
}: ContractsModuleProps) {
  const t = translations[language];

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // New/Edit form modal state
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // States for printing and deleting natively inside sandbox iframe
  const [selectedContractForPrint, setSelectedContractForPrint] = useState<Contract | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const printDocRef = useRef<HTMLDivElement>(null);
  const handlePrintContract = useReactToPrint({
    contentRef: printDocRef,
    pageStyle: `@media print { 
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background-color: white !important; } 
    } 
    @page { size: A4 portrait; margin: 15mm; }`
  });
  
  // Form fields
  const [customerName, setCustomerName] = useState<string>("");
  const [contractType, setContractType] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [endDate, setEndDate] = useState<string>("");
  const [visitInterval, setVisitInterval] = useState<"weekly" | "biweekly" | "monthly" | "quarterly" | "custom">("monthly");
  const [visitIntervalValue, setVisitIntervalValue] = useState<number>(30);
  const [nextVisitDate, setNextVisitDate] = useState<string>("");
  const [lastVisitDate, setLastVisitDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [status, setStatus] = useState<"Active" | "Expired" | "Pending">("Active");
  const [formSaving, setFormSaving] = useState<boolean>(false);

  // Fetch contracts on mount
  const fetchContracts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/contracts");
      if (res.ok) {
        const data = await res.json();
        setContracts(data);
      }
    } catch (e) {
      console.error("Failed to load contracts:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();

    socket.on("contractsUpdated", (contractsList: Contract[]) => {
      setContracts(contractsList);
    });

    return () => {
      socket.off("contractsUpdated");
    };
  }, []);

  // Sync end-date when start date or duration changes
  useEffect(() => {
    if (startDate && durationMonths) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        const end = new Date(start.setMonth(start.getMonth() + Number(durationMonths)));
        setEndDate(end.toISOString().split("T")[0]);
      }
    }
  }, [startDate, durationMonths]);

  // Set default interval value based on selection
  useEffect(() => {
    if (visitInterval === "weekly") setVisitIntervalValue(7);
    else if (visitInterval === "biweekly") setVisitIntervalValue(14);
    else if (visitInterval === "monthly") setVisitIntervalValue(30);
    else if (visitInterval === "quarterly") setVisitIntervalValue(90);
  }, [visitInterval]);

  // Initialize next visit date to start date when starting fresh
  useEffect(() => {
    if (!editingId && startDate && !nextVisitDate) {
      setNextVisitDate(startDate);
    }
  }, [startDate, editingId]);

  const handleOpenCreateForm = () => {
    setEditingId(null);
    setCustomerName("");
    setContractType("");
    setLocation("");
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
    setDurationMonths(12);
    setVisitInterval("monthly");
    setVisitIntervalValue(30);
    setNextVisitDate(today);
    setLastVisitDate("");
    setNotes("");
    setStatus("Active");
    setShowForm(true);
  };

  const handleOpenEditForm = (c: Contract) => {
    setEditingId(c.id);
    setCustomerName(c.customerName);
    setContractType(c.contractType);
    setLocation(c.location);
    setStartDate(c.startDate);
    setDurationMonths(c.durationMonths);
    setEndDate(c.endDate);
    setVisitInterval(c.visitInterval);
    setVisitIntervalValue(c.visitIntervalValue);
    setNextVisitDate(c.nextVisitDate);
    setLastVisitDate(c.lastVisitDate || "");
    setNotes(c.notes || "");
    setStatus(c.status);
    setShowForm(true);
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !contractType || !location || !startDate || !nextVisitDate) {
      alert(language === "ar" ? "يرجى ملء جميع الحقول الإلزامية *" : "Please fill in all required fields *");
      return;
    }

    try {
      setFormSaving(true);
      const payload = {
        customerName,
        contractType,
        location,
        startDate,
        endDate,
        durationMonths: Number(durationMonths),
        visitInterval,
        visitIntervalValue: Number(visitIntervalValue),
        nextVisitDate,
        lastVisitDate: lastVisitDate || null,
        notes,
        status
      };

      const url = editingId ? `/api/contracts/${editingId}` : "/api/contracts";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const saved: Contract = await res.json();
        
        if (editingId) {
          addLog(
            `تم تحديث بيانات العقد برقم ${saved.id} للعميل ${saved.customerName}`,
            `Contract details for ${saved.id} (${saved.customerName}) have been updated`,
            "settings"
          );
        } else {
          addNotification(
            language === "ar" 
              ? `تم تسجيل عقد صيانة وقائية جديد بنجاح للعميل [${saved.customerName}]` 
              : `New operational maintenance contract successfully on-boarded for [${saved.customerName}]`
          );
          addLog(
            `تم تسجيل عقد صيانة وقائية جديد برقم ${saved.id} للعميل ${saved.customerName}`,
            `New maintenance contract registered: ${saved.id} for client: ${saved.customerName}`,
            "settings"
          );
        }
        setShowForm(false);
        fetchContracts();
      } else {
        alert("Operation failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const executeDeleteContract = async () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    try {
      const res = await fetch(`/api/contracts/${id}`, { method: "DELETE" });
      if (res.ok) {
        addLog(
          `تم إلغاء وحذف العقد رقم ${id} الخاص بالعميل ${name} من السيستم.`,
          `Contract ${id} for client ${name} was entirely deleted from the system databases.`,
          "settings"
        );
        addNotification(
          language === "ar"
            ? `🗑️ تم حذف عقد الصيانة للعميل [${name}] بنجاح من السيستم.`
            : `🗑️ Maintenance contract for [${name}] was successfully deleted permanently.`
        );
        fetchContracts();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteTarget(null);
    }
  };

  // Perform Manual Site Visit - schedules the next check-up date instantly
  const handleLogSiteVisit = async (c: Contract) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const nextDays = Number(c.visitIntervalValue) || 30;
    
    // Calculate next visit date based on today + interval days
    const nextDateObj = new Date();
    nextDateObj.setDate(nextDateObj.getDate() + nextDays);
    const nextVisitStr = nextDateObj.toISOString().split("T")[0];

    try {
      const updated = {
        ...c,
        lastVisitDate: todayStr,
        nextVisitDate: nextVisitStr
      };

      const res = await fetch(`/api/contracts/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });

      if (res.ok) {
        addNotification(
          language === "ar"
            ? `✅ تم توثيق زيارة الموقع لعقد العميل [${c.customerName}] بنجاح. وجاري جدولة الزيارة التالية بتاريخ ${nextVisitStr}`
            : `✅ Site visit registered for [${c.customerName}] contract. Next routine visit scheduled for ${nextVisitStr}`
        );
        addLog(
          `تم توثيق زيارة موقع ناجحة وتحديث جدول الزيارات للعقد ${c.id} (${c.customerName}).`,
          `Successfully registered a completed site visit and updated next run schedule for Contract ${c.id}.`,
          "field"
        );
        fetchContracts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter & Search logic
  const filteredContracts = contracts.filter(c => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      c.customerName.toLowerCase().includes(query) ||
      c.contractType.toLowerCase().includes(query) ||
      c.location.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query);

    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && c.status.toLowerCase() === statusFilter.toLowerCase();
  });

  // Calculate alerts & statistics
  const totalCount = contracts.length;
  const activeCount = contracts.filter(c => c.status === "Active").length;
  
  // A visit is due if nextVisitDate <= today
  const today = new Date().toISOString().split("T")[0];
  const dueVisitsContracts = contracts.filter(c => c.status === "Active" && c.nextVisitDate <= today);

  // Contracts nearing end: active and ending in less than 30 days
  const nearingExpiryContracts = contracts.filter(c => {
    if (c.status !== "Active") return false;
    const diffTime = new Date(c.endDate).getTime() - new Date(today).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  const getStatusBadge = (stat: "Active" | "Expired" | "Pending") => {
    switch (stat) {
      case "Active":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold leading-none bg-[#E6F4EA] text-[#137333]">
            ● {language === "ar" ? "ساري ونشط" : "Active & Valid"}
          </span>
        );
      case "Expired":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold leading-none bg-[#FCE8E6] text-[#C5221F]">
            ● {language === "ar" ? "منتهي" : "Expired"}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold leading-none bg-[#FEF7E0] text-[#B06000]">
            ● {language === "ar" ? "معلّق" : "Pending Approval"}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="contracts-module-root">
      
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E2E6ED] pb-5">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight font-cairo flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-blue-600 shrink-0" />
            <span>{t.contractsTitle}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1 font-medium leading-relaxed max-w-2xl">
            {t.contractsSubtitle}
          </p>
        </div>
        
        <button
          onClick={handleOpenCreateForm}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-xs transition-all flex items-center gap-2 justify-center cursor-pointer"
        >
          <Briefcase className="w-4 h-4" />
          <span>{t.addContract}</span>
        </button>
      </div>

      {/* Analytics KPI Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E6ED] rounded-2xl p-4 shadow-3xs flex items-center gap-4">
          <div className="p-3 bg-[#EBF3FF] text-[#1A56DB] rounded-xl shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">{language === "ar" ? "إجمالي العقود" : "Total Contracts"}</span>
            <span className="text-xl font-extrabold text-gray-900 mt-1 block font-mono">{totalCount}</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E6ED] rounded-2xl p-4 shadow-3xs flex items-center gap-4">
          <div className="p-3 bg-[#E6F4EA] text-[#137333] rounded-xl shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">{language === "ar" ? "العقود السارية" : "Active & Valid"}</span>
            <span className="text-xl font-extrabold text-emerald-700 mt-1 block font-mono">{activeCount}</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E6ED] rounded-2xl p-4 shadow-3xs flex items-center gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${dueVisitsContracts.length > 0 ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-slate-50 text-slate-500"}`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">{language === "ar" ? "المواقع المستحقة للزيارة" : "Sites Due for Visit"}</span>
            <span className={`text-xl font-extrabold mt-1 block font-mono ${dueVisitsContracts.length > 0 ? "text-rose-600" : "text-gray-900"}`}>{dueVisitsContracts.length}</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E6ED] rounded-2xl p-4 shadow-3xs flex items-center gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${nearingExpiryContracts.length > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-500"}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">{language === "ar" ? "عقود تشارف على الانتهاء" : "Nearing Expiration"}</span>
            <span className={`text-xl font-extrabold mt-1 block font-mono ${nearingExpiryContracts.length > 0 ? "text-amber-600" : "text-gray-900"}`}>{nearingExpiryContracts.length}</span>
          </div>
        </div>
      </div>

      {/* Critical Warnings / Urgent Alerts Panel if visits or expirations are outstanding */}
      {(dueVisitsContracts.length > 0 || nearingExpiryContracts.length > 0) && (
        <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-black text-rose-800 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{language === "ar" ? "⚠️ إشعارات وتنبيهات السيستم الحرجة ومواعيد العمل" : "⚠️ Urgent Systematic Attention Required"}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Visit Alerts */}
            {dueVisitsContracts.length > 0 && (
              <div className="bg-white border border-rose-100 rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-xs text-rose-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{language === "ar" ? "بانتظار زيارة الموقع اليوم (استحقاق دائم)" : "Sites Overdue/Due for Visits today"}</span>
                </h3>
                <div className="space-y-1.5 divide-y divide-slate-100 max-h-40 overflow-y-auto no-scrollbar">
                  {dueVisitsContracts.map(c => (
                    <div key={c.id} className="pt-2 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <p className="font-extrabold text-[#111827]">{c.customerName}</p>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{c.location}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleLogSiteVisit(c)}
                        className="py-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{language === "ar" ? "تأكيد الزيارة" : "Mark Visited"}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expiring Contract Alerts */}
            {nearingExpiryContracts.length > 0 && (
              <div className="bg-white border border-amber-100 rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-xs text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{language === "ar" ? "عقود تنتهي قريباً (أقل من 30 يوماً)" : "Agreements Expiring within 30 Days"}</span>
                </h3>
                <div className="space-y-1.5 divide-y divide-slate-100 max-h-40 overflow-y-auto no-scrollbar">
                  {nearingExpiryContracts.map(c => {
                    const diff = new Date(c.endDate).getTime() - new Date(today).getTime();
                    const daysRemaining = Math.ceil(diff / (1000 * 3600 * 24));
                    return (
                      <div key={c.id} className="pt-2 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-extrabold text-slate-800">{c.customerName}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{c.contractType}</p>
                        </div>
                        <div className="text-end">
                          <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-800 font-extrabold rounded">
                            {language === "ar" ? `متبقي ${daysRemaining} يوم` : `${daysRemaining} days left`}
                          </span>
                          <p className="text-[9px] text-gray-400 font-mono mt-0.5">{c.endDate}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main filter, search and table layout */}
      <div className="bg-white border border-[#E2E6ED] rounded-2xl shadow-3xs overflow-hidden">
        
        {/* Controls Panel */}
        <div className="p-4 bg-slate-50/50 border-b border-[#E2E6ED] flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={language === "ar" ? "ابحث بالعميل، نوع العقد أو الموقع..." : "Search by customer, type, site..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar self-stretch sm:self-center">
            {["all", "active", "pending", "expired"].map(filterKey => (
              <button
                key={filterKey}
                onClick={() => setStatusFilter(filterKey)}
                className={`py-2 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === filterKey
                    ? "bg-[#1A56DB] text-white shadow-3xs"
                    : "bg-white border border-[#E2E6ED] text-gray-600 hover:text-gray-800"
                }`}
              >
                {filterKey === "all" && (language === "ar" ? "الكل" : "All Agreements")}
                {filterKey === "active" && (language === "ar" ? "العقود النشطة" : "Active")}
                {filterKey === "pending" && (language === "ar" ? "تحت التدقيق" : "Pending")}
                {filterKey === "expired" && (language === "ar" ? "منتهية الصلاحية" : "Expired")}
              </button>
            ))}
          </div>
        </div>

        {/* Table representation */}
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-400 font-bold">
            <Clock className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
            <span>{language === "ar" ? "جاري جلب العقود ومراجعة الجداول..." : "Fetching contracts & schedules..."}</span>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold">{language === "ar" ? "لا توجد عقود مسجلة بالهوية المحددة" : "No contract records found"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider border-b border-[#E2E6ED]">
                  <th className="px-5 py-4 text-start font-cairo">{t.contractCode}</th>
                  <th className="px-5 py-4 text-start font-cairo">{t.clientNameLabel}</th>
                  <th className="px-5 py-4 text-start font-cairo">{t.contractTypeLabel}</th>
                  <th className="px-5 py-4 text-start font-cairo">{t.locationLabel}</th>
                  <th className="px-5 py-4 text-center font-cairo">{t.visitIntervalLabel}</th>
                  <th className="px-5 py-4 text-center font-cairo">{t.nextVisitLabel}</th>
                  <th className="px-5 py-4 text-center font-cairo">{t.endDateLabel}</th>
                  <th className="px-5 py-4 text-center font-cairo">{language === "ar" ? "الحالة" : "Status"}</th>
                  <th className="px-5 py-4 text-end font-cairo no-print">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-gray-700">
                {filteredContracts.map(c => {
                  const isVisitOverdue = c.status === "Active" && c.nextVisitDate <= today;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 hover:bg-opacity-50 transition-all">
                      {/* Code */}
                      <td className="px-5 py-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                        {c.id}
                      </td>

                      {/* Name */}
                      <td className="px-5 py-4 font-extrabold text-slate-800 whitespace-nowrap">
                        {c.customerName}
                      </td>

                      {/* Type */}
                      <td className="px-5 py-4 font-medium text-slate-600 max-w-xs truncate">
                        {c.contractType}
                      </td>

                      {/* Location */}
                      <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[150px]">{c.location}</span>
                        </div>
                      </td>

                      {/* Interval */}
                      <td className="px-5 py-4 text-center whitespace-nowrap font-bold text-blue-600">
                        {language === "ar" ? (
                          c.visitInterval === "weekly" ? t.visitWeekly :
                          c.visitInterval === "biweekly" ? t.visitBiweekly :
                          c.visitInterval === "monthly" ? t.visitMonthly :
                          c.visitInterval === "quarterly" ? t.visitQuarterly :
                          `${c.visitIntervalValue} ${t.days}`
                        ) : (
                          c.visitInterval === "weekly" ? t.visitWeekly :
                          c.visitInterval === "biweekly" ? t.visitBiweekly :
                          c.visitInterval === "monthly" ? t.visitMonthly :
                          c.visitInterval === "quarterly" ? t.visitQuarterly :
                          `${c.visitIntervalValue} ${t.days}`
                        )}
                      </td>

                      {/* Next visit */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <span className={`px-2 py-1 font-mono font-extrabold rounded-lg ${isVisitOverdue ? "bg-rose-50 text-rose-700 animate-pulse" : "bg-slate-100 text-slate-700"}`} title={isVisitOverdue ? "زيارة مستحقة ديدلاين اليوم!" : ""}>
                          {c.nextVisitDate}
                        </span>
                      </td>

                      {/* End date */}
                      <td className="px-5 py-4 text-center whitespace-nowrap font-mono text-gray-500">
                        {c.endDate}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        {getStatusBadge(c.status)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-end whitespace-nowrap no-print">
                        <div className="flex justify-end gap-1.5">
                          {c.status === "Active" && (
                            <button
                              onClick={() => handleLogSiteVisit(c)}
                              title={language === "ar" ? "توثيق زيارة الموقع اليوم" : "Log manual site visit today"}
                              className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg cursor-pointer"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => setSelectedContractForPrint(c)}
                            title={language === "ar" ? "معاينة وطباعة مستند العقد بالألوان" : "Preview & print contract with rich colors"}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEditForm(c)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteClick(c.id, c.customerName)}
                            className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modern Dialog Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden font-cairo">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden border border-[#E2E6ED] shadow-xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="border-b border-[#E2E6ED] p-5 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-extrabold text-gray-900">
                {editingId 
                  ? (language === "ar" ? `📝 تعديل العقد التشغيلي ${editingId}` : `📝 Edit operational Contract ${editingId}`)
                  : t.addContract}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable form code */}
            <form onSubmit={handleSaveContract} className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
              
              {/* Partner */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">{t.clientNameLabel} *</label>
                <input
                  type="text"
                  required
                  placeholder={language === "ar" ? "أدخل اسم العميل / الجهة التعاقدية..." : "Enter client / contract partner name..."}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Type / Scope */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">{t.contractTypeLabel} *</label>
                <input
                  type="text"
                  required
                  placeholder={language === "ar" ? "أدخل موضوع الصيانة / نوع العقد..." : "Enter maintenance scope or contract type..."}
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Workplace Site Location */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">{t.locationLabel} *</label>
                <input
                  type="text"
                  required
                  placeholder={language === "ar" ? "أدخل مكان العمل بالتفصيل..." : "Enter detailed workplace site location..."}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Dates & duration inline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{t.startDateLabel} *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{t.durationLabel} *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Display End date derived form of state */}
              <div className="bg-[#F8FAFC] border border-[#E2E6ED] rounded-xl p-3 flex justify-between items-center text-xs">
                <span className="font-bold text-gray-500">{t.endDateLabel}:</span>
                <span className="font-mono font-extrabold text-[#111827]">{endDate || "—"}</span>
              </div>

              {/* Visit frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{t.visitIntervalLabel} *</label>
                  <select
                    value={visitInterval}
                    onChange={(e: any) => setVisitInterval(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="weekly">{t.visitWeekly}</option>
                    <option value="biweekly">{t.visitBiweekly}</option>
                    <option value="monthly">{t.visitMonthly}</option>
                    <option value="quarterly">{t.visitQuarterly}</option>
                    <option value="custom">{t.visitCustom}</option>
                  </select>
                </div>

                {visitInterval === "custom" ? (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">{language === "ar" ? "معدل الأيام المخصص" : "Custom Days interval"}</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={visitIntervalValue}
                      onChange={(e) => setVisitIntervalValue(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-[#9CA3AF] mb-1">{language === "ar" ? "قيمة الفاصل (أيام)" : "Days Interval Equivalent"}</label>
                    <input
                      type="text"
                      disabled
                      value={`${visitIntervalValue} ${t.days}`}
                      className="w-full px-3 py-2 bg-[#F1F5F9] border border-[#E2E6ED] text-gray-400 rounded-xl text-xs select-none cursor-not-allowed"
                    />
                  </div>
                )}
              </div>

              {/* Next visit date manual picker or initial setter */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">{t.nextVisitLabel} *</label>
                <input
                  type="date"
                  required
                  value={nextVisitDate}
                  onChange={(e) => setNextVisitDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Status & Last Visit Date (mostly for updates) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{language === "ar" ? "حالة العقد" : "Contract Status"}</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="Active">{language === "ar" ? "نشط وساري" : "Active & Valid"}</option>
                    <option value="Pending">{language === "ar" ? "معلق للمراجعة" : "Pending"}</option>
                    <option value="Expired">{language === "ar" ? "منتهي الصلاحية" : "Expired"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{language === "ar" ? "تاريخ آخر زيارة" : "Last Visit Date"}</label>
                  <input
                    type="date"
                    value={lastVisitDate}
                    onChange={(e) => setLastVisitDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">{t.notes}</label>
                <textarea
                  placeholder={language === "ar" ? "أدخل تفاصيل إضافية أو ملاحظات عن بنود العقد هنا..." : "Enter supplementary contract notes or specifications here..."}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden resize-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="border-t border-[#E2E6ED] pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  {language === "ar" ? "إلغاء الأمر" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                >
                  {formSaving ? (language === "ar" ? "جاري الحفظ..." : "Saving...") : (language === "ar" ? "حفظ وتثبيت العقد" : "Save & Register")}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Native UI for safety inside Iframe) */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-cairo">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden border border-[#E2E6ED] shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-gray-900">
                {language === "ar" ? "تأكيد حذف العقد نهائياً؟" : "Confirm Contract Deletion?"}
              </h3>
            </div>
            
            <p className="text-xs text-gray-500 leading-relaxed font-semibold">
              {language === "ar" 
                ? `هل أنت متأكد من حذف وإلغاء العقد الخاص بـ [${deleteTarget.name}] تماماً من السجلات؟ لا يمكن التراجع عن هذا الإجراء الإداري.`
                : `Are you sure you want to permanently delete and wipe the contract for [${deleteTarget.name}]? This action is administrative and cannot be reversed.`}
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {language === "ar" ? "تراجع وإلغاء" : "Cancel"}
              </button>
              <button
                onClick={executeDeleteContract}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {language === "ar" ? "نعم، حذف نهائي" : "Yes, Delete PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official High-Contrast Document Print Preview Modal */}
      {selectedContractForPrint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden font-cairo animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden border border-[#E2E6ED] shadow-xl flex flex-col max-h-[90vh]">
            
            {/* Header control */}
            <div className="border-b border-[#E2E6ED] p-4 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-black text-[#111827] flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <span>{language === "ar" ? `معاينة وثيقة العقد الرسمية والطباعة` : `Contract SLA Official Document Preview`}</span>
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintContract}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>{language === "ar" ? "اطبع بالألوان كاملة" : "Print In Color"}</span>
                </button>
                <button
                  onClick={() => setSelectedContractForPrint(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document display wrapper */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
              
              {/* Paper Canvas */}
              <div 
                ref={printDocRef}
                className="bg-white mx-auto p-12 border border-slate-300 w-full max-w-[210mm] shadow-md font-cairo text-slate-800 relative select-text text-start"
                dir={language === "ar" ? "rtl" : "ltr"}
              >
                {/* Visual corners */}
                <div className="absolute top-0 right-0 w-20 h-20 border-t-[3px] border-r-[3px] border-blue-600 p-4 pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-20 h-20 border-t-[3px] border-l-[3px] border-blue-600 p-4 pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-20 h-20 border-b-[3px] border-r-[3px] border-blue-600 p-4 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 border-b-[3px] border-l-[3px] border-blue-600 p-4 pointer-events-none"></div>

                {/* Cover Header */}
                <div className="flex justify-between items-start pb-6 border-b-2 border-blue-600 mb-6">
                  <div className="space-y-1 max-w-[65%]">
                    <h2 className="text-base font-black text-blue-900">
                      {language === "ar" ? settings.systemTitleAr : settings.systemTitleEn}
                    </h2>
                    <p className="text-[10px] text-gray-500 font-bold">
                      {language === "ar" ? "قسم تشغيل الصيانة الميدانية الدورية والـ SLA" : "Field SLA Operations & Scheduled Maintenance Dept."}
                    </p>
                    <p className="text-[9px] text-gray-400 font-mono font-bold">
                      {language === "ar" 
                        ? `${settings.companyAddressAr || "الرياض، المملكة العربية السعودية"} | هاتف: ${settings.companyPhone || "920084729"}`
                        : `${settings.companyAddressEn || "Riyadh, KSA"} | Tel: ${settings.companyPhone || "920084729"}`
                      }
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-14 h-14 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-2xs [&_svg]:w-full [&_svg]:h-full [&_svg]:max-w-full [&_svg]:max-h-full [&_img]:w-full [&_img]:h-full [&_img]:object-contain">
                      {settings.systemLogo ? (
                        <div dangerouslySetInnerHTML={{ __html: settings.systemLogo }} className="w-full h-full flex items-center justify-center" />
                      ) : (
                        <span className="text-xs font-black text-blue-700">Logo</span>
                      )}
                    </div>
                    <span className="text-[8px] font-mono tracking-widest text-blue-800 font-extrabold mt-1">SLA SYSTEM</span>
                  </div>

                  <div className="space-y-1 text-end" dir="ltr">
                    <h2 className="text-xs font-black text-blue-900 uppercase">OFFICIAL SLA DOCUMENT</h2>
                    <p className="text-[9px] text-gray-500 font-bold">Contract Verification Pipe</p>
                    <p className="text-[9px] text-gray-400 font-mono font-semibold">Ref: {selectedContractForPrint.id}</p>
                  </div>
                </div>

                {/* Banner title with background color (perfect colors for print) */}
                <div className="bg-[#1e40af] text-white text-center rounded-lg p-3.5 mb-7 shadow-2xs">
                  <h1 className="text-sm font-black tracking-wide leading-none uppercase">
                    {language === "ar" ? "وثيقة عقد الصيانة التشغيلية والزيارات الوقائية" : "PREVENTIVE MAINTENANCE & SERVICE LEVEL AGREEMENT"}
                  </h1>
                  <p className="text-[9px] text-blue-200 font-mono mt-1 font-bold">
                    ID: {selectedContractForPrint.id} — STATUS: {selectedContractForPrint.status === "Active" ? "SARI & ACTIVE" : selectedContractForPrint.status}
                  </p>
                </div>

                {/* Parties identification block */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 space-y-1.5">
                    <h3 className="text-[11px] font-black text-blue-800 border-b border-slate-200 pb-1">{language === "ar" ? "الطرف الأول (مقدم الخدمة):" : "First Party (Service Provider):"}</h3>
                    <p className="text-xs font-black text-slate-800">
                      {language === "ar" ? settings.systemTitleAr : settings.systemTitleEn}
                    </p>
                    <p className="text-[10px] text-slate-500 leading-snug">{language === "ar" ? "ممثل الطرف الأول: مدير هندسة الصيانة الوقائية والتشغيل." : "Representative: Director of Preventive System Engineering."}</p>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 space-y-1.5">
                    <h3 className="text-[11px] font-black text-blue-800 border-b border-slate-200 pb-1">{language === "ar" ? "الطرف الثاني (العميل المتعاقد):" : "Second Party (Client Partner):"}</h3>
                    <p className="text-xs font-black text-slate-800">{selectedContractForPrint.customerName}</p>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      {language === "ar" ? `موقع العمل: ${selectedContractForPrint.location}` : `Site Workplace: ${selectedContractForPrint.location}`}
                    </p>
                  </div>
                </div>

                {/* Specifications Parameters Grid */}
                <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                        <th className="px-3.5 py-2 text-start">{language === "ar" ? "بند المواصفة التشغيلية" : "Service Specification Area"}</th>
                        <th className="px-3.5 py-2 text-center">{language === "ar" ? "القيمة المتفق عليها" : "Configured Standard Value"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      <tr>
                        <td className="px-3.5 py-2.5 font-bold bg-slate-50/30">{language === "ar" ? "رقم مرجع العقد المكتوب" : "Contract Ref ID"}</td>
                        <td className="px-3.5 py-2.5 font-mono font-black text-blue-700 text-center">{selectedContractForPrint.id}</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2.5 font-bold bg-slate-50/30">{language === "ar" ? "موضوع وشروط النطاق الفني" : "Maintenance Scope / Description"}</td>
                        <td className="px-3.5 py-2.5 text-center font-bold">{selectedContractForPrint.contractType}</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2.5 font-bold bg-slate-50/30">{language === "ar" ? "تاريخ فاعلية العقد" : "Contract Active Start"}</td>
                        <td className="px-3.5 py-2.5 text-center font-mono font-semibold">{selectedContractForPrint.startDate}</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2.5 font-bold bg-slate-50/30">{language === "ar" ? "تاريخ ديدلاين انتهاء الصلاحية" : "Contract Expiration Date"}</td>
                        <td className="px-3.5 py-2.5 text-center font-mono font-black text-rose-700">{selectedContractForPrint.endDate}</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2.5 font-bold bg-slate-50/30">{language === "ar" ? "معدل تواتر الزيارات الوقائية" : "Site Visit Interval Plan"}</td>
                        <td className="px-3.5 py-2.5 text-center font-black text-blue-600">
                          {selectedContractForPrint.visitInterval === "weekly" ? "أسبوعي (كل 7 أيام)" :
                           selectedContractForPrint.visitInterval === "biweekly" ? "أسبوعين (كل 14 يوم)" :
                           selectedContractForPrint.visitInterval === "monthly" ? "شهري (كل 30 يوم)" :
                           selectedContractForPrint.visitInterval === "quarterly" ? "كل 3 أشهر (كل 90 يوم)" :
                           `${selectedContractForPrint.visitIntervalValue} يوم`}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2.5 font-bold bg-slate-50/30">{language === "ar" ? "الزيارة المجدولة القادمة" : "Next Field Operations Visit"}</td>
                        <td className="px-3.5 py-2.5 text-center font-mono font-black text-emerald-800 bg-emerald-50/50">{selectedContractForPrint.nextVisitDate}</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2.5 font-bold bg-slate-50/30">{language === "ar" ? "حالة سريان التغطية الفنية" : "SLA Warranty Validity"}</td>
                        <td className="px-3.5 py-2.5 text-center font-black text-emerald-700">
                          {selectedContractForPrint.status === "Active" ? (language === "ar" ? "نشط - مغطى بالدعم الفني بالكامل" : "SUPPORT VALID & ACTIVE") : (language === "ar" ? "غير مفعل أو منتهي" : "EXPIRED / SUSPENDED")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Supplementary footnotes rules */}
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 mb-7 space-y-1">
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">{language === "ar" ? "ملاحظات إضافية وشروط التغطية الرقمية:" : "Supplementary footnotes & terms:"}</h4>
                  <p className="text-[10px] text-slate-600 leading-relaxed font-semibold whitespace-pre-wrap">
                    {selectedContractForPrint.notes || (language === "ar" ? "لا توجد أي شروط مخصصة إضافية. يلتزم الطرف الأول بتوفير الدعم الميداني والصيانة الوقائية لضمان عمل كافة المعدات والأجهزة بأعلى كفاءة تشغيلية طوال فترة العقد." : "No custom footnotes. First party guarantees standard coverage and preventative field actions according to the contract guidelines.")}
                  </p>
                </div>

                {/* Signatures Row */}
                <div className="mt-12 pt-6 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-8 text-center text-[11px]">
                    <div className="space-y-4">
                      <p className="font-black text-slate-800">
                        {language === "ar" ? `الطرف الأول: ممثل ${settings.systemTitleAr}` : `Party One: Authorized ${settings.systemTitleEn} Signature`}
                      </p>
                      <div className="h-14 flex items-center justify-center">
                        <div className="border border-dashed border-blue-400 bg-blue-50/40 text-[9px] text-blue-800 font-bold font-mono py-1 px-3.5 rounded uppercase tracking-widest">
                          VERIFIED SLA PASSED
                        </div>
                      </div>
                      <div className="w-1/2 border-b border-slate-300 mx-auto"></div>
                      <p className="text-[9px] text-gray-400">{language === "ar" ? "التاريخ والخاتم الرسمي للعمليات" : "Official Operations Stamp & Date"}</p>
                    </div>

                    <div className="space-y-4">
                      <p className="font-black text-slate-800">{language === "ar" ? "الطرف الثاني: العميل / الشريك المتعاقد" : "Party Two: Authorized Client Partner Signature"}</p>
                      <div className="h-14 flex items-center justify-center">
                        <span className="text-[9px] text-gray-400 italic">{language === "ar" ? "توقيع رقمي / ختم الشريك" : "(Stamp / Signature / Sealed)"}</span>
                      </div>
                      <div className="w-1/2 border-b border-slate-300 mx-auto"></div>
                      <p className="text-[9px] text-gray-400">{language === "ar" ? "الاسم الرباعي والصفة الوظيفية" : "Representative Authorized Name"}</p>
                    </div>
                  </div>
                </div>

                {/* Footer validation */}
                <div className="mt-12 pt-2 border-t border-slate-100 text-center text-[8px] text-[#A55EEA] font-mono">
                  <span>
                    {language === "ar" 
                      ? `عقد نظامي مسجل ومحمي بموجب شروط الجودة لبرمجة ${settings.systemTitleAr} الميدانية الرقمية.` 
                      : `This digital document was sealed and certified via ${settings.systemTitleEn} SLA Broadcast Pipe.`
                    }
                  </span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
