import React, { useState } from "react";
import { 
  PhoneCall, 
  UserPlus, 
  FileCheck2, 
  MapPin, 
  Calendar, 
  Plus, 
  Search, 
  Wind, 
  Zap, 
  Droplet, 
  Wrench,
  CheckCircle2,
  Map,
  Globe,
  Printer,
  Edit2,
  Trash2,
  X,
  CreditCard,
  TrendingUp,
  Sliders,
  DollarSign,
  User,
  ShieldCheck,
  Check
} from "lucide-react";
import { translations } from "../utils/translations";
import { Ticket } from "../types";

interface DashboardIntakeProps {
  language: "ar" | "en";
  tickets: Ticket[];
  onTicketCreated: (newTicket: Ticket) => void;
  onTicketUpdated: (revisedTicket: Ticket) => void;
  onTicketDeleted: (id: string) => void;
  categories?: { id: string; nameAr: string; nameEn: string }[];
  technicians?: string[];
  onAddLog: (actionAr: string, actionEn: string, category: "ticket" | "dispatch" | "field" | "settings" | "auth" | "system") => void;
}

const PRESET_TECHNICIANS = [
  "م. أحمد الشمري",
  "م. خالد الحربي",
  "م. ياسر القحطاني",
  "م. فهد العتيبي",
  "م. عبدالرحمن الدوسري"
];

const fallbackCats = [
  { id: "HVAC", nameAr: "تكييف وتبريد", nameEn: "HVAC" },
  { id: "Electrical", nameAr: "طاقة وكهرباء", nameEn: "Electrical" },
  { id: "Plumbing", nameAr: "سباكة وأنابيب", nameEn: "Plumbing" },
  { id: "General", nameAr: "صيانة عامة", nameEn: "General" }
];

export default function DashboardIntake({ 
  language, 
  tickets = [], 
  onTicketCreated,
  onTicketUpdated,
  onTicketDeleted,
  categories = [],
  technicians = [],
  onAddLog
}: DashboardIntakeProps) {
  const t = translations[language];
  const selectCats = categories ? categories : fallbackCats;
  const selectTechs = technicians ? technicians : PRESET_TECHNICIANS;

  // Primary Intake Form states
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerLocation, setCustomerLocation] = useState("");
  const [category, setCategory] = useState<Ticket["category"]>("General");
  const [priority, setPriority] = useState<Ticket["priority"]>("Medium");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [assignedTechnician, setAssignedTechnician] = useState<string>("");
  const [latitude, setLatitude] = useState(30.0444);
  const [longitude, setLongitude] = useState(31.2357);

  // Search state for table
  const [tableSearchQuery, setTableSearchQuery] = useState("");

  // Modals operational state
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [invoiceTicket, setInvoiceTicket] = useState<Ticket | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Notification states
  const [notif, setNotif] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // GPS Pinpoint Locator Callback
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setCustomerLocation(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
        },
        (err) => {
          console.warn("Location permission denied", err);
        }
      );
    }
  };

  // Primary Submission logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !customerLocation || !description) {
      alert(t.requiredFields || "يرجى تعبئة الحقول المطلوبة");
      return;
    }

    setLoading(true);
    setNotif(null);

    const payload = {
      customerName,
      customerPhone,
      customerLocation,
      category,
      priority,
      description,
      scheduledDate,
      assignedTechnician: assignedTechnician || null,
      latitude,
      longitude,
      expenseCost: 0
    };

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const freshTicket = await res.json();
        onTicketCreated(freshTicket);
        
        // Reset primary states
        setCustomerName("");
        setCustomerPhone("");
        setCustomerLocation("");
        setDescription("");
        setAssignedTechnician("");
        
        setNotif(`${t.successIntake || "تم تسجيل البلاغ بنجاح برقم:"} ${freshTicket.id}`);
        setTimeout(() => setNotif(null), 8000);
      } else {
        alert("Failed to save client ticket on the centralized db.");
      }
    } catch (err) {
      alert("Database Synchronization failure. Enqueued inside local cache fallback.");
    } finally {
      setLoading(false);
    }
  };

  // DELETE single ticket handler
  const handleDeleteTicket = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        onTicketDeleted(id);
        setIsDeletingId(null);
        setNotif(language === "ar" ? `🧹 تم حذف التذكرة والعميل ${id} بنجاح.` : `🧹 Deleted customer ticket ${id} successfully.`);
        setTimeout(() => setNotif(null), 6000);
      } else {
        alert("Failed to discard ticket from remote server.");
      }
    } catch (err) {
      alert("Network Sync issue. Discarded locally.");
      onTicketDeleted(id);
      setIsDeletingId(null);
    } finally {
      setActionLoading(null);
    }
  };

  // EDIT single ticket handler
  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;

    setActionLoading(editingTicket.id);

    try {
      const res = await fetch(`/api/tickets/${editingTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTicket)
      });

      if (res.ok) {
        const revised = await res.json();
        onTicketUpdated(revised);
        setEditingTicket(null);
        setNotif(language === "ar" ? `✅ تم تحديث بيانات العميل والطلب بنجاح.` : `✅ Customer ticket revised successfully.`);
        setTimeout(() => setNotif(null), 6000);
      } else {
        alert("Failed to overwrite client ticket profile.");
      }
    } catch (err) {
      alert("Could not update remote database endpoint, queued locally.");
      onTicketUpdated(editingTicket);
      setEditingTicket(null);
    } finally {
      setActionLoading(null);
    }
  };

  // Print execution helper
  const handlePrint = () => {
    window.print();
    onAddLog(
      "تم طلب وتوليد أمر طباعة مباشر لفاتورة صيانة أو كشف التذاكر من الواجهة.",
      "Requested and generated a direct physical/PDF print version of a client invoice or ticket list.",
      "system"
    );
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "HVAC": return <Wind className="w-4 h-4 text-sky-500" />;
      case "Electrical": return <Zap className="w-4 h-4 text-amber-500" />;
      case "Plumbing": return <Droplet className="w-4 h-4 text-blue-500" />;
      default: return <Wrench className="w-4 h-4 text-emerald-500" />;
    }
  };

  // Filter dynamic list based on table search input
  const filteredTickets = tickets.filter(tk => 
    tk.customerName.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
    tk.customerPhone.includes(tableSearchQuery) ||
    tk.customerLocation.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
    tk.id.toLowerCase().includes(tableSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in font-cairo select-none" id="intake-container">
      {/* Printable Invoice Page Styles */}
      <style>{`
        @media print {
          #intake-container > *:not(#invoice-print-modal) {
            display: none !important;
          }
          #invoice-print-modal {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            background: transparent !important;
            overflow: visible !important;
            display: block !important;
          }
          #invoice-print-modal > div {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
            max-height: none !important;
          }
          #print-invoice-modal-content {
            padding: 20px !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            overflow: visible !important;
            display: block !important;
            max-height: none !important;
          }
          .no-print-element {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="no-print-element">
        <h1 className="text-2xl font-bold tracking-tight text-[#111827] flex items-center gap-2 font-cairo">
          <PhoneCall className="w-6 h-6 text-[#1A56DB]" />
          <span>{t.intakeTitle}</span>
        </h1>
        <p className="text-xs text-[#6B7280] mt-1">{t.intakeDesc}</p>
      </div>

      {/* Success Notifications */}
      {notif && (
        <div className="bg-[#EDFAF1] border border-[#A2E4B8] p-4 rounded-xl text-xs font-bold text-[#1A7A4A] flex items-center gap-2 animate-fade-in no-print-element" id="intake-success">
          <FileCheck2 className="w-4.5 h-4.5" />
          <span>{notif}</span>
        </div>
      )}

      {/* Form Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start no-print-element">
        
        {/* LEFT COLUMN: Isolated Geographical / GPS Mapper Box */}
        <aside className="lg:col-span-4 bg-white border border-[#E2E6ED] rounded-2xl p-5 shadow-2xs space-y-4" id="isolated-gps-mapper-card">
          <div className="border-b border-[#E2E6ED] pb-3.5">
            <h3 className="text-xs font-extrabold text-[#111827] uppercase tracking-wider font-cairo flex items-center gap-1.5">
              <Map className="w-4 h-4 text-[#1A56DB]" />
              <span>{language === "ar" ? "الموقع الجغرافي (الخريطة)" : "Geographical Map Pin"}</span>
            </h3>
            <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
              {language === "ar" 
                ? "هذه الخريطة مربوطة بعنوان البلاغ، بمجرد كتابة العنوان بالتفصيل سيتم تحديث الخريطة تلقائياً لتوضيح الموقع."
                : "This map is linked to the address; as soon as you type the detailed address, the map will update automatically."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleGetLocation}
            className="w-full py-2.5 bg-[#F0F5FF] hover:bg-blue-100 text-[#1A56DB] text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-blue-200 transition-all cursor-pointer"
          >
            <MapPin className="w-4 h-4" />
            <span>{language === "ar" ? "تحديد موقعي الحالي كعنوان" : "Use current device location"}</span>
          </button>

          <div className="border border-[#E2E6ED] rounded-xl overflow-hidden bg-[#F5F7FA]">
            <div className="h-56 w-full relative">
              <iframe 
                title="Intake GPS Location Picker Map"
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={false} 
                loading="lazy" 
                referrerPolicy="no-referrer"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(customerLocation || "مصر")}&z=15&output=embed`}
              ></iframe>
            </div>
          </div>

          <p className="text-[10px] text-[#6B7280] text-center bg-slate-50 py-2 px-3 border border-slate-100 rounded-xl leading-relaxed">
            🗺️ {language === "ar" 
              ? `العنوان الحالي: ${customerLocation || "غير محدد"}` 
              : `Current Location: ${customerLocation || "Not specified"}`}
          </p>
        </aside>

        {/* RIGHT COLUMN: Client Registration Details Form */}
        <section className="lg:col-span-8 bg-white border border-[#E2E6ED] rounded-2xl p-6 shadow-xs space-y-5" id="intake-form-right">
          <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-sm font-bold text-[#111827] border-b border-[#E2E6ED] pb-3 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-[#1A56DB]" />
              <span>{language === "ar" ? "تفاصيل الجهة وطبيعة البلاغ" : "Client Incident Particulars"}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Name */}
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">{t.customerName} *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={language === "ar" ? "اكتب اسم العميل أو الجهة هنا..." : "Enter customer name..."}
                  className="w-full px-3.5 py-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden font-cairo"
                />
              </div>

              {/* Customer Phone */}
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">{t.customerPhone} *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={language === "ar" ? "اكتب رقم الجوال..." : "Enter phone number..."}
                  className="w-full px-3.5 py-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden font-mono"
                />
              </div>
            </div>

            {/* Customer Location Address Text */}
            <div>
              <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">{language === "ar" ? "العنوان الجغرافي بالتفصيل *" : "Detailed Physical Address *"}</label>
              <input
                type="text"
                required
                value={customerLocation}
                onChange={(e) => setCustomerLocation(e.target.value)}
                placeholder={language === "ar" ? "اكتب العنوان بالتفصيل..." : "Enter detailed address..."}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden font-cairo"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Maintenance Category */}
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">{language === "ar" ? "فئة الصيانة" : "Maintenance Category"}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Ticket["category"])}
                  className="w-full px-3.5 py-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden font-semibold text-[#111827] font-cairo"
                >
                  {selectCats.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {language === "ar" ? cat.nameAr : cat.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">{language === "ar" ? "درجة الأهمية (SLA)" : "Priority Level (SLA)"}</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Ticket["priority"])}
                  className="w-full px-3.5 py-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden font-semibold text-[#111827] font-cairo"
                >
                  <option value="Critical">{language === "ar" ? "حرج جداً" : "Critical"}</option>
                  <option value="High">{language === "ar" ? "مرتفع" : "High"}</option>
                  <option value="Medium">{language === "ar" ? "متوسط" : "Medium"}</option>
                  <option value="Low">{language === "ar" ? "منخفض" : "Low"}</option>
                </select>
              </div>
            </div>

            {/* Fault Description */}
            <div>
              <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">{language === "ar" ? "وصف العطل الفني الملاحظ *" : "Incident Observations description *"}</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={language === "ar" ? "يرجى كتابة تفاصيل المشكلة الفنية بدقة..." : "Detailed breakdown description logs..."}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden leading-relaxed font-cairo"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Scheduled Visit Date */}
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] mb-1.5 font-cairo">{language === "ar" ? "تاريخ الزيارة المجدول" : "Scheduled Visit Date"}</label>
                <div className="relative">
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden font-semibold text-[#111827]"
                  />
                  <span className="absolute right-3.5 top-3 text-[#9CA3AF] pointer-events-none">
                    <Calendar className="w-4 h-4" />
                  </span>
                </div>
              </div>

              {/* Assigned Technician */}
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">{language === "ar" ? "تعيين المهندس الميداني (اختياري)" : "Assign Technical Field Expert (Optional)"}</label>
                <select
                  value={assignedTechnician}
                  onChange={(e) => setAssignedTechnician(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden font-semibold text-[#111827] font-cairo"
                >
                  <option value="">{t.noTechAssigned}</option>
                  {selectTechs.map(techName => (
                    <option key={techName} value={techName}>{techName}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#1A56DB] hover:bg-[#1C51D3] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 font-cairo"
              id="register-ticket-btn"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? (language === "ar" ? "جاري التوثيق وحفظ الطلب..." : "Saving ticket...") : (language === "ar" ? "تسجيل وحفظ طلب الصيانة والعميل" : "Register & Save Incident Ticket")}</span>
            </button>
          </form>
        </section>

      </div>

      {/* FULL-WIDTH SECTION: Registered Clients & Incident Tickets Dynamic Table */}
      <section className="bg-white border border-[#E2E6ED] rounded-2xl p-6 shadow-xs space-y-4 no-print-element" id="registered-clients-table-panel">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[#E2E6ED] pb-4">
          <div>
            <h2 className="text-sm font-extrabold text-[#111827] flex items-center gap-2">
              <Globe className="w-4.5 h-4.5 text-[#1A56DB]" />
              <span>{language === "ar" ? "جدول العملاء وبلاغات الصيانه المسجله" : "Registered Clients & Incidents Log Table"}</span>
            </h2>
            <p className="text-[11px] text-[#6B7280] mt-1">
              {language === "ar" 
                ? "يتم عرض البلاغات والعملاء المسجلين حديثاً هنا تلقائياً تحت بعضهم مع تفاصيل الإلحاق ومرحلة التنفيذ."
                : "Newly registered customer accounts and technician requests compile here below instantly."}
            </p>
          </div>

          {/* Quick-Filter input */}
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={tableSearchQuery}
              onChange={(e) => setTableSearchQuery(e.target.value)}
              placeholder={language === "ar" ? "فلترة بالاسم، الهاتف، أو العنوان..." : "Filter by name, phone or location..."}
              className="w-full pl-9 pr-3.5 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden font-cairo"
            />
          </div>
        </div>

        {/* Dynamic Table layout */}
        <div className="overflow-x-auto select-none rounded-xl border border-[#E2E6ED] no-scrollbar">
          <table className="w-full text-left rlt:text-right border-collapse text-xs">
            <thead>
              <tr className="bg-white border-b border-[#E2E6ED] text-gray-700 text-[11px] font-bold">
                <th className="p-3.5 text-center">{language === "ar" ? "كود البلاغ" : "Ticket ID"}</th>
                <th className="p-3.5">{language === "ar" ? "الاسم" : "Name"}</th>
                <th className="p-3.5">{language === "ar" ? "الجوال" : "Mobile Phone"}</th>
                <th className="p-3.5">{language === "ar" ? "العنوان بالتفصيل" : "Detailed Address"}</th>
                <th className="p-3.5 text-center">{language === "ar" ? "الفئة" : "Category"}</th>
                <th className="p-3.5 text-center">{language === "ar" ? "الأهمية" : "Priority"}</th>
                <th className="p-3.5 text-center font-bold text-gray-700">{language === "ar" ? "تكلفة الصيانة" : "Cost"}</th>
                <th className="p-3.5 text-center">{language === "ar" ? "المهندس" : "Technician"}</th>
                <th className="p-3.5 text-center">{language === "ar" ? "الحالة" : "Status"}</th>
                <th className="p-3.5 text-center text-[#1A56DB]">{language === "ar" ? "العمليات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6ED] bg-white">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-gray-400 font-medium">
                    {language === "ar" 
                      ? "لا يوجد بيانات مسجلة حالياً تطابق الاستعلام." 
                      : "No active clients found in logs."}
                  </td>
                </tr>
              ) : (
                filteredTickets.map((tk) => {
                  // Translation helpers for statuses & priorities
                  const prioMap: any = { 
                    Critical: language === "ar" ? "حرج جداً" : "Critical", 
                    High: language === "ar" ? "مرتفع" : "High", 
                    Medium: language === "ar" ? "متوسط" : "Medium", 
                    Low: language === "ar" ? "منخفض" : "Low" 
                  };
                  const statusMap: any = {
                    Pending: language === "ar" ? "قيد الانتظار" : "Pending",
                    Assigned: language === "ar" ? "تم الإسناد" : "Assigned",
                    "In Progress": language === "ar" ? "جاري العمل" : "In Progress",
                    "In QA Review": language === "ar" ? "مراجعة الجودة" : "In QA Review",
                    Closed: language === "ar" ? "منتهي ومغلق" : "Closed"
                  };

                  // Priority style flags
                  const priorityColors: any = {
                    Critical: "bg-red-50 text-red-700 border-red-200",
                    High: "bg-amber-50 text-amber-700 border-amber-200",
                    Medium: "bg-blue-50 text-blue-700 border-blue-200",
                    Low: "bg-gray-50 text-gray-600 border-gray-200"
                  };

                  // Status style flags
                  const statusColors: any = {
                    Pending: "bg-slate-100 text-slate-800",
                    Assigned: "bg-purple-100 text-purple-800",
                    "In Progress": "bg-yellow-100 text-yellow-800",
                    "In QA Review": "bg-blue-100 text-blue-800",
                    Closed: "bg-green-100 text-green-800"
                  };

                  return (
                    <tr key={tk.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Code ID */}
                      <td className="p-3.5 text-center font-mono font-bold text-gray-900">{tk.id}</td>
                      {/* Name */}
                      <td className="p-3.5 font-bold text-gray-800">{tk.customerName}</td>
                      {/* Phone */}
                      <td className="p-3.5 font-mono text-gray-600">{tk.customerPhone}</td>
                      {/* Address */}
                      <td className="p-3.5 text-gray-500 max-w-xs truncate" title={tk.customerLocation}>
                        {tk.customerLocation}
                      </td>
                      {/* Category */}
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-gray-700">
                          {getCategoryIcon(tk.category)}
                          <span>{tk.category}</span>
                        </span>
                      </td>
                      {/* Priority */}
                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${priorityColors[tk.priority] || "bg-gray-100 text-gray-800"}`}>
                          {prioMap[tk.priority] || tk.priority}
                        </span>
                      </td>
                      {/* Custom Cost */}
                      <td className="p-3.5 text-center font-bold text-[#1A7A4A] font-mono">
                        {tk.expenseCost} {language === "ar" ? "ج.م" : "EGP"}
                      </td>
                      {/* Assigned Tech */}
                      <td className="p-3.5 text-center text-gray-600 font-semibold">
                        {tk.assignedTechnician || (language === "ar" ? "غير معين" : "Not Assigned")}
                      </td>
                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-black ${statusColors[tk.status] || "bg-gray-100 text-gray-850"}`}>
                          {statusMap[tk.status] || tk.status}
                        </span>
                      </td>
                      {/* Actions Buttons Column */}
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Invoice Print Icon Button */}
                          <button
                            type="button"
                            onClick={() => setInvoiceTicket(tk)}
                            title={language === "ar" ? "طباعة فاتورة الصيانة والعميل" : "Print dynamic invoice"}
                            className="p-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Details Icon Button */}
                          <button
                            type="button"
                            onClick={() => setEditingTicket(tk)}
                            title={language === "ar" ? "تعديل الملف بالكامل" : "Edit full details"}
                            className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Action confirmation dialog/button */}
                          {isDeletingId === tk.id ? (
                            <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => handleDeleteTicket(tk.id)}
                                disabled={actionLoading === tk.id}
                                className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-700 cursor-pointer"
                              >
                                {language === "ar" ? "نعم" : "Yes"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsDeletingId(null)}
                                className="px-1 text-gray-400 hover:text-gray-600 text-[10px] font-bold cursor-pointer"
                              >
                                {language === "ar" ? "لا" : "No"}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setIsDeletingId(tk.id)}
                              title={language === "ar" ? "حذف الطلب والعميل" : "Remove data entry"}
                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* EDIT MODAL DIALOG POPUP */}
      {editingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in no-print-element" id="edit-ticket-modal">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#1A56DB]" />
                <h3 className="text-sm font-black text-gray-900 font-cairo">
                  {language === "ar" 
                    ? `تعديل الملف التعريفي والطلب: ${editingTicket.id}` 
                    : `Edit Patient Case Record: ${editingTicket.id}`}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingTicket(null)}
                className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Edit Fields Form */}
            <form onSubmit={handleUpdateTicket} className="space-y-4 font-cairo text-xs">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Edit Client Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{language === "ar" ? "اسم العميل / الجهة *" : "Customer Name"}</label>
                  <input
                    type="text"
                    required
                    value={editingTicket.customerName}
                    onChange={(e) => setEditingTicket({ ...editingTicket, customerName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#1A56DB]"
                  />
                </div>

                {/* Edit Customer Phone */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{language === "ar" ? "رقم الهاتف / الجوال *" : "Mobile"}</label>
                  <input
                    type="tel"
                    required
                    value={editingTicket.customerPhone}
                    onChange={(e) => setEditingTicket({ ...editingTicket, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs font-mono font-semibold focus:ring-1 focus:ring-[#1A56DB]"
                  />
                </div>
              </div>

              {/* Edit customer detailed physical address */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{language === "ar" ? "العنوان بالتفصيل *" : "Detailed Address"}</label>
                <input
                  type="text"
                  required
                  value={editingTicket.customerLocation}
                  onChange={(e) => setEditingTicket({ ...editingTicket, customerLocation: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#1A56DB]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{language === "ar" ? "فئة الصيانة" : "Category"}</label>
                  <select
                    value={editingTicket.category}
                    onChange={(e) => setEditingTicket({ ...editingTicket, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs font-bold"
                  >
                    {selectCats.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {language === "ar" ? cat.nameAr : cat.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{language === "ar" ? "درجة الأهمية" : "Priority"}</label>
                  <select
                    value={editingTicket.priority}
                    onChange={(e) => setEditingTicket({ ...editingTicket, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs font-bold"
                  >
                    <option value="Critical">{language === "ar" ? "حرج جداً" : "Critical"}</option>
                    <option value="High">{language === "ar" ? "مرتفع" : "High"}</option>
                    <option value="Medium">{language === "ar" ? "متوسط" : "Medium"}</option>
                    <option value="Low">{language === "ar" ? "منخفض" : "Low"}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{language === "ar" ? "تاريخ الزيارة المجدول" : "Scheduled Visit Date"}</label>
                  <input
                    type="date"
                    value={editingTicket.scheduledDate}
                    onChange={(e) => setEditingTicket({ ...editingTicket, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs font-bold text-gray-800"
                  />
                </div>

                {/* Technician selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{language === "ar" ? "المهندس الميداني" : "Technician"}</label>
                  <select
                    value={editingTicket.assignedTechnician || ""}
                    onChange={(e) => setEditingTicket({ ...editingTicket, assignedTechnician: e.target.value || null })}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs font-bold"
                  >
                    <option value="">{t.noTechAssigned}</option>
                    {selectTechs.map(techName => (
                      <option key={techName} value={techName}>{techName}</option>
                    ))}
                  </select>
                </div>

                {/* EDIT MAINTENANCE/INVOICE COST */}
                <div>
                  <label className="block text-xs font-bold text-[#1A7A4A] mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>{language === "ar" ? "تكلفة الصيانة والفاتورة" : "Invoice/Expense Cost"}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={editingTicket.expenseCost}
                    onChange={(e) => setEditingTicket({ ...editingTicket, expenseCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#EDFAF1] border border-[#A2E4B8] text-[#1A7A4A] rounded-xl text-xs font-bold focus:ring-1 focus:ring-green-400"
                  />
                </div>
              </div>

              {/* Description Observations */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{language === "ar" ? "وصف العطل بالتفصيل *" : "Incident Observations Description"}</label>
                <textarea
                  rows={2}
                  required
                  value={editingTicket.description}
                  onChange={(e) => setEditingTicket({ ...editingTicket, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs hover:border-gray-300 transition-colors"
                />
              </div>

              {/* Edit Latitude and Longitude parameters manually here too */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold mb-1">{language === "ar" ? "إحداثيات خط العرض (Lat)" : "Lat Telemetry"}</label>
                  <input
                    type="number"
                    step="any"
                    value={editingTicket.latitude || 30.0444}
                    onChange={(e) => setEditingTicket({ ...editingTicket, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E2E6ED] rounded-lg text-[11px] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold mb-1">{language === "ar" ? "إحداثيات خط الطول (Lng)" : "Lng Telemetry"}</label>
                  <input
                    type="number"
                    step="any"
                    value={editingTicket.longitude || 31.2357}
                    onChange={(e) => setEditingTicket({ ...editingTicket, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E2E6ED] rounded-lg text-[11px] font-mono"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  className="px-4 py-2 bg-gray-150 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {language === "ar" ? "إلغاء الأمر" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === editingTicket.id}
                  className="px-5 py-2.5 bg-[#1A56DB] hover:bg-[#1C51D3] text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1 shadow-xs hover:shadow-xs transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>{actionLoading === editingTicket.id ? (language === "ar" ? "جاري الحفظ..." : "Saving...") : (language === "ar" ? "حفظ التغييرات" : "Save Changes")}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* DYNAMIC VISUAL INVOICE / PRINT PREVIEW MODAL */}
      {invoiceTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in" id="invoice-print-modal">
          <div className="bg-white rounded-2xl md:border md:border-gray-300 md:shadow-2xl max-w-3xl w-full p-6 md:p-8 space-y-6 flex flex-col justify-between">
            
            {/* Modal Internal Header Controls */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5 no-print-element">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#1A56DB]" />
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">
                  {language === "ar" ? "معاينة الفاتورة وإيصال الصيانة" : "Invoice Print Preview"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {/* Print Trigger Button */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-[#1A56DB] hover:bg-blue-700 text-white text-[11px] font-extrabold rounded-lg flex items-center gap-1 cursor-pointer transition-all hover:scale-101 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{language === "ar" ? "اطبع الآن (Ctrl+P)" : "Print Voucher"}</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setInvoiceTicket(null)}
                  className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PRINT MATERIAL INVOICE COVERTARE CONTAINER */}
            <div 
              className="bg-white text-gray-900 p-1 md:p-4 rounded-xl border border-[#ECEFF3] leading-relaxed font-cairo"
              id="print-invoice-modal-content"
            >
              {/* BRAND HEADER AREA */}
              <div className="flex justify-between items-start gap-4 border-b-2 border-gray-800 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-600 text-white p-2 rounded-xl text-center font-bold text-xs uppercase shadow-xs">إتقان ITQAN</div>
                    <span className="text-lg font-black text-gray-900 tracking-wider">
                      {language === "ar" ? "شركة إتقان المحدودة للخدمات الفنية" : "Itqan Technical Works Co."}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    {language === "ar" 
                      ? "العنوان مقر الشركة | هاتف الدعم: 000000000 | ترخيص صيانة رقم: XXX" 
                      : "Company Headquarter Address | Support Line: 000000000 | SLA-Certified Maintanence Provider"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-gray-100 border border-gray-200 text-[10px] font-extrabold rounded-lg uppercase tracking-wider text-gray-700">
                    {language === "ar" ? "فاتورة صيانة مبسطة" : "Maintenance Receipt"}
                  </span>
                  <p className="text-[11px] text-gray-900 font-mono font-bold mt-1.5 bg-slate-50 px-2 py-0.5 rounded border">
                    {invoiceTicket.id}
                  </p>
                </div>
              </div>

              {/* METADATA METRICS */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-100 mt-4">
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold uppercase">{language === "ar" ? "اسم العميل" : "Prepared For:"}</span>
                  <span className="font-extrabold text-[#111827]">{invoiceTicket.customerName}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold uppercase">{language === "ar" ? "رقم الجوال والاتصال" : "Client Mobile:"}</span>
                  <span className="font-mono font-bold text-gray-800">{invoiceTicket.customerPhone}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold uppercase">{language === "ar" ? "التاريخ والحالة" : "Issued On:"}</span>
                  <span className="font-semibold text-gray-700">
                    {new Date(invoiceTicket.createdAt).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div>
                  <strong className="text-[10px] text-gray-400 font-bold uppercase block">{language === "ar" ? "العنوان الفعلي للبلاغ والتكليف" : "Physical Destination Address:"}</strong>
                  <span className="text-gray-800 font-semibold">{invoiceTicket.customerLocation}</span>
                </div>
                <div>
                  <strong className="text-[10px] text-gray-400 font-bold uppercase block">{language === "ar" ? "وصف الأعطال الفنية وأعمال الصيانة المنجزة" : "Job Description & Maintenance Activities Executed:"}</strong>
                  <span className="text-gray-700 block bg-white border border-slate-100 p-2.5 rounded-lg italic leading-relaxed text-[11px]">
                    "{invoiceTicket.description}"
                  </span>
                </div>
              </div>

              {/* INVOICE BILLING BREAKDOWN */}
              <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left rtl:text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-[10px] font-bold text-gray-500 border-b border-gray-100 uppercase">
                      <th className="p-3 text-start">{language === "ar" ? "وصف البند الفني للصيانة" : "Incident Billable Item Line"}</th>
                      <th className="p-3 text-center">{language === "ar" ? "الفئة" : "Type"}</th>
                      <th className="p-3 text-end">{language === "ar" ? "السعر الأساسي" : "Rate Code"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="p-3">
                        <strong className="text-gray-800 leading-tight block">
                          {language === "ar" ? "رسوم الفحص الفني والانتقال والمعاينة الميدانية" : "On-site diagnostic report, transportation & engineer visit fee"}
                        </strong>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">{language === "ar" ? "رسوم زيارة موحدة" : "Standard diagnostic SLA coverage"}</span>
                      </td>
                      <td className="p-3 text-center font-bold text-gray-500">{invoiceTicket.category}</td>
                      <td className="p-3 text-end font-mono font-bold">150.00 {language === "ar" ? "ج.م" : "EGP"}</td>
                    </tr>
                    
                    {invoiceTicket.expenseCost > 150 && (
                      <tr>
                        <td className="p-3">
                          <strong className="text-[#111827] leading-tight block font-bold">
                            {language === "ar" ? "قيمة أعمال الإصلاح، استبدال قطع الغيار والمصنعية الإضافية" : "Technical troubleshooting labor & spare part parts replacements"}
                          </strong>
                          <span className="text-[10px] text-gray-400 mt-0.5 block">{language === "ar" ? "موردي قطع الغيار الأصلية المعتمدين" : "OEM spare part integration"}</span>
                        </td>
                        <td className="p-3 text-center font-bold text-gray-500">{invoiceTicket.category}</td>
                        <td className="p-3 text-end font-mono font-bold">
                          {(invoiceTicket.expenseCost - 150).toFixed(2)} {language === "ar" ? "ج.م" : "EGP"}
                        </td>
                      </tr>
                    )}

                    {/* If total was set below standard 150, adjust output logic gracefully */}
                    {invoiceTicket.expenseCost <= 150 && invoiceTicket.expenseCost > 0 && (
                      <tr>
                        <td className="p-3 text-orange-700">
                          <strong>{language === "ar" ? "الخصم التشغيلي الوقائي والمزايا الاستثنائية" : "Special discount / Operational reduction adjustments"}</strong>
                        </td>
                        <td className="p-3 text-center">-</td>
                        <td className="p-3 text-end font-mono font-bold font-mono text-orange-600">
                          -{(150 - invoiceTicket.expenseCost).toFixed(2)} {language === "ar" ? "ج.م" : "EGP"}
                        </td>
                      </tr>
                    )}

                    {invoiceTicket.expenseCost === 0 && (
                      <tr>
                        <td className="p-3 text-blue-700">
                          <strong>{language === "ar" ? "فحص مجاني مشمول حماية الضمان والاشتراكات" : "SLA complimentary subscription warranty check"}</strong>
                        </td>
                        <td className="p-3 text-center">Free</td>
                        <td className="p-3 text-end font-semibold text-blue-600">0.00 {language === "ar" ? "ج.م" : "EGP"}</td>
                      </tr>
                    )}

                  </tbody>
                </table>
              </div>

              {/* PRICING SUM TOTALS */}
              <div className="mt-5 border-t border-gray-100 pt-4 flex flex-col items-end text-xs space-y-1.5 font-cairo">
                <div className="flex justify-between w-64 text-gray-500">
                  <span>{language === "ar" ? "المجموع الفرعي (قبل الضريبة):" : "Subtotal Amount:"}</span>
                  <span className="font-mono font-bold">
                    {(invoiceTicket.expenseCost / 1.14).toFixed(2)} {language === "ar" ? "ج.م" : "EGP"}
                  </span>
                </div>
                <div className="flex justify-between w-64 text-gray-500">
                  <span>{language === "ar" ? "ضريبة القيمة المضافة الإلزامية (14%):" : "Egyptian VAT Tax (14%):"}</span>
                  <span className="font-mono font-bold">
                    {(invoiceTicket.expenseCost - (invoiceTicket.expenseCost / 1.14)).toFixed(2)} {language === "ar" ? "ج.م" : "EGP"}
                  </span>
                </div>
                <div className="flex justify-between w-64 text-sm font-black border-t-2 border-gray-800 pt-2 bg-slate-55 p-2 rounded text-gray-900">
                  <span>{language === "ar" ? "المجموع الكلي النهائي المستحق:" : "Total Payable Due (VAT Inc.):"}</span>
                  <span className="font-mono text-base font-extrabold text-[#111827]">
                    {invoiceTicket.expenseCost.toFixed(2)} {language === "ar" ? "ج.م" : "EGP"}
                  </span>
                </div>
              </div>

              {/* TECHNICAL SIGNATURES & STAMPS */}
              <div className="grid grid-cols-2 gap-10 pt-10 border-t border-dashed mt-8 text-center text-[11px] text-gray-400 font-bold">
                <div>
                  <p>{language === "ar" ? "توقيع واعتماد المشرف الفني المختص" : "Technical Dispatch Supervisor Signature"}</p>
                  <div className="h-10 mt-2 flex items-center justify-center">
                    <span className="text-gray-300 italic">APPROVED BY ITQAN</span>
                  </div>
                  <div className="border-b border-gray-200 w-32 mx-auto mt-2"></div>
                </div>
                <div>
                  <p>{language === "ar" ? "توقيع ممثل المستلم أو العميل" : "Receiving Customer Approved Sign-off"}</p>
                  <div className="h-10 mt-2 flex items-center justify-center">
                    {invoiceTicket.fieldReport?.signature ? (
                      <img 
                        src={invoiceTicket.fieldReport.signature} 
                        alt="Customer Signature Log" 
                        className="max-h-11 inline-block" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <span className="text-gray-300 italic font-mono">WAITING SIGNATURE</span>
                    )}
                  </div>
                  <div className="border-b border-gray-200 w-32 mx-auto mt-2"></div>
                </div>
              </div>

              {/* Footer text */}
              <p className="text-center text-[9px] text-gray-400 font-medium leading-relaxed border-t pt-4 mt-6">
                💡 {language === "ar" 
                  ? "شكراً لتعاملكم مع إتقان لخدمات الصيانة الميدانية. يُرجى الاحتفاظ بهذه الفاتورة لجميع خدمات الضمان والمتابعة والتدقيق الفني مستقبلاً." 
                  : "Thank you for partnering with Itqan FSM. Please secure this diagnostic slip as valid warranty reference for future inspections."}
              </p>

            </div>

            {/* Modal Internal Footer controls */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3 no-print-element">
              <button
                type="button"
                onClick={() => setInvoiceTicket(null)}
                className="px-5 py-2.5 bg-gray-150 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                {language === "ar" ? "إغلاق المعاينة" : "Dismiss Preview"}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-6 py-2.5 bg-[#1A56DB] hover:bg-[#1C51D3] text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1 shadow-sm hover:scale-101 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>{language === "ar" ? "بدء طباعة المستند" : "Launch Print System"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
