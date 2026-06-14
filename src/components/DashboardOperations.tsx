import React, { useState } from "react";
import { 
  Users, 
  Search, 
  MapPin, 
  Phone, 
  MoreVertical, 
  CheckCircle,
  ExternalLink, 
  Copy, 
  UserCheck, 
  AlertTriangle,
  ClipboardCheck,
  ShieldCheck,
  Eye,
  Printer,
  Trash2,
  Edit2,
  X,
  Calendar
} from "lucide-react";
import { translations } from "../utils/translations";
import { Ticket } from "../types";

interface DashboardOperationsProps {
  language: "ar" | "en";
  tickets: Ticket[];
  onTicketUpdated: (updated: Ticket) => void;
  onTicketDeleted: (id: string) => void;
  onOpenFieldPortalSimulator: (id: string) => void;
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

export default function DashboardOperations({
  language,
  tickets,
  onTicketUpdated,
  onTicketDeleted,
  onOpenFieldPortalSimulator,
  categories = [],
  technicians = [],
  onAddLog
}: DashboardOperationsProps) {
  const t = translations[language];
  const selectCats = categories ? categories : fallbackCats;
  const selectTechs = technicians ? technicians : PRESET_TECHNICIANS;

  // Filters & Searching
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedPriority, setSelectedPriority] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");

  // Selected ticket for detailed edit drawer
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;

  // Invoice & Edit modal triggers
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [invoiceTicket, setInvoiceTicket] = useState<Ticket | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notif, setNotif] = useState<string | null>(null);

  // Edit fields
  const [updatingTech, setUpdatingTech] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<Ticket["status"]>("Pending");
  const [updatingPriority, setUpdatingPriority] = useState<Ticket["priority"]>("Medium");
  const [saveLoading, setSaveLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter logic
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customerPhone.includes(searchTerm) ||
      (ticket.assignedTechnician && ticket.assignedTechnician.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "All" || ticket.category === selectedCategory;
    const matchesPriority = selectedPriority === "All" || ticket.priority === selectedPriority;
    const matchesStatus = selectedStatus === "All" || ticket.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  const handleOpenEdit = (ticket: Ticket) => {
    setSelectedTicketId(ticket.id);
    setUpdatingTech(ticket.assignedTechnician || "");
    setUpdatingStatus(ticket.status);
    setUpdatingPriority(ticket.priority);
  };

  const handleCopyPortalLink = (ticketId: string) => {
    let basePath = window.location.href.split('?')[0];
    if (basePath.includes('ais-dev')) {
      basePath = basePath.replace('ais-dev', 'ais-pre');
    }
    const link = `${basePath}?portal=field&id=${ticketId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(ticketId);
      setTimeout(() => setCopiedId(null), 3000);
    }).catch(err => {
      alert(language === "ar" ? "تعذر نسخ الرابط. هذا هو الرابط الخاص بك: " + link : "Could not copy link. Here is your link: " + link);
    });
  };

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

  const handlePrint = () => {
    window.print();
    onAddLog(
      "تم من خلال شاشة العمليات والتحكم طباعة فاتورة ومعاينة فنية تفصيلية لأمر عمل صيانة.",
      "Generated and printed direct technical receipt invoice from the operations control desk.",
      "system"
    );
  };

  const handleSaveTicketUpdates = async () => {
    if (!selectedTicket) return;
    setSaveLoading(true);

    const payload = {
      assignedTechnician: updatingTech || null,
      status: updatingStatus,
      priority: updatingPriority
    };

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const revised = await res.json();
        onTicketUpdated(revised);
        setSelectedTicketId(null);
      } else {
        alert("Operations update failed.");
      }
    } catch (err) {
      alert("Error synchronizing with primary server.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleQuickStatusChange = async (ticket: Ticket, nextStatus: Ticket["status"]) => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        const revised = await res.json();
        onTicketUpdated(revised);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper color tags matching Arabic & English properties
  const getPriorityBadgeColors = (prio: string) => {
    switch (prio) {
      case "Critical": return "bg-[#FFF0F0] text-[#C0392B] border border-[#FADBD8]";
      case "High": return "bg-amber-50 text-amber-800 border border-amber-200";
      case "Medium": return "bg-[#EBF3FF] text-[#1A56DB] border border-blue-200";
      default: return "bg-[#EDFAF1] text-[#1A7A4A] border border-green-200";
    }
  };

  const getStatusBadgeColors = (stat: string) => {
    switch (stat) {
      case "Pending": return "bg-[#FFF0F0] text-[#C0392B]";
      case "Assigned": return "bg-blue-50 text-blue-800";
      case "In Progress": return "bg-amber-50 text-amber-800";
      case "In QA Review": return "bg-purple-50 text-purple-800 animate-pulse font-bold";
      case "Closed": return "bg-[#EDFAF1] text-[#1A7A4A] font-bold";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6" id="operations-container">
      {/* Top Title Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] flex items-center gap-2 font-cairo">
            <Users className="w-6 h-6 text-[#1A56DB]" />
            <span>{t.opsTitle}</span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">{t.opsDesc}</p>
        </div>
      </div>

      {/* Grid Filter Panel */}
      <div className="bg-white border border-[#E2E6ED] rounded-2xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4" id="ops-filter-panel">
        {/* Search bar */}
        <div className="relative">
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden"
          />
          <span className="absolute left-2.5 top-3.5 text-[#9CA3AF]">
            <Search className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Category filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:outline-hidden"
        >
          <option value="All">{language === "ar" ? "كل التخصصات الفنية" : "All Specialties"}</option>
          {selectCats.map(cat => (
            <option key={cat.id} value={cat.id}>
              {language === "ar" ? cat.nameAr : cat.nameEn}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="px-3 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:outline-hidden text-xs font-semibold"
        >
          <option value="All">{language === "ar" ? "كل درجات الأهمية" : "All Priorities"}</option>
          <option value="Critical">{t.prioCritical}</option>
          <option value="High">{t.prioHigh}</option>
          <option value="Medium">{t.prioMedium}</option>
          <option value="Low">{t.prioLow}</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:outline-hidden text-xs font-bold"
        >
          <option value="All">{language === "ar" ? "كل الحالات التشغيلية" : "All Cycle Phases"}</option>
          <option value="Pending">{t.statPending}</option>
          <option value="Assigned">{t.statAssigned}</option>
          <option value="In Progress">{t.statInProgress}</option>
          <option value="In QA Review">{t.statInQA}</option>
          <option value="Closed">{t.statClosed}</option>
        </select>
      </div>

      {/* Main Ticket Grid / Table */}
      <div className="bg-white border border-[#E2E6ED] rounded-2xl shadow-xs overflow-hidden" id="operations-table-wrap">
        <div className="p-4 bg-white border-b border-[#E2E6ED] flex justify-between items-center">
          <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
            {t.allTickets} ({filteredTickets.length})
          </h2>
          {/* Quick status counters */}
          <div className="flex gap-2 text-[10px] font-bold">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
              {tickets.filter(t => t.status === "Pending").length} {language === "ar" ? "جديد" : "New"}
            </span>
            <span className="px-2 py-0.5 bg-[#FFF8EB] text-[#B45309] rounded-full">
              {tickets.filter(t => t.status === "In Progress").length} {language === "ar" ? "ميداني" : "Field"}
            </span>
            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">
              {tickets.filter(t => t.status === "In QA Review").length} QA
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right lg:text-start border-collapse text-xs">
            <thead>
              <tr className="bg-white border-b border-[#E2E6ED] text-[#6B7280] font-semibold">
                <th className="p-4">{t.ticketCode}</th>
                <th className="p-4">{language === "ar" ? "الجهة / العقد" : "Client"}</th>
                <th className="p-4">{t.categoryLabel}</th>
                <th className="p-4">{t.priorityLabel}</th>
                <th className="p-4">{t.assignedTo}</th>
                <th className="p-4">{t.ticketStatus}</th>
                <th className="p-4 text-center">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6ED]">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-[#F5F7FA]/60 transition-colors">
                  {/* Ticket ID */}
                  <td className="p-4 font-mono font-bold text-[#111827]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A56DB]"></span>
                      {ticket.id}
                    </div>
                  </td>

                  {/* Customer and phone */}
                  <td className="p-4">
                    <div>
                      <p className="font-bold text-[#111827] line-clamp-1">{ticket.customerName}</p>
                      <p className="text-[10px] text-[#6B7280] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-[#9CA3AF]" />
                        <span className="font-mono">{ticket.customerPhone}</span>
                      </p>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="p-4">
                    <span className="font-semibold text-[#111827]">
                      {(() => {
                        const matched = selectCats.find(c => c.id === ticket.category);
                        return matched ? (language === "ar" ? matched.nameAr : matched.nameEn) : ticket.category;
                      })()}
                    </span>
                  </td>

                  {/* Priority Pill */}
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${getPriorityBadgeColors(ticket.priority)}`}>
                      {ticket.priority === "Critical" ? t.prioCritical :
                       ticket.priority === "High" ? t.prioHigh :
                       ticket.priority === "Medium" ? t.prioMedium : t.prioLow}
                    </span>
                  </td>

                  {/* Technicians */}
                  <td className="p-4 font-medium">
                    {ticket.assignedTechnician ? (
                      <span className="text-[#111827] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        {ticket.assignedTechnician}
                      </span>
                    ) : (
                      <span className="text-amber-600 font-semibold italic">
                        ⚠️ {t.noTechAssigned}
                      </span>
                    )}
                  </td>

                  {/* Status Pill */}
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeColors(ticket.status)}`}>
                      {ticket.status === "Pending" ? t.statPending :
                       ticket.status === "Assigned" ? t.statAssigned :
                       ticket.status === "In Progress" ? t.statInProgress :
                       ticket.status === "In QA Review" ? t.statInQA : t.statClosed}
                    </span>
                  </td>

                  {/* Fast Action Buttons */}
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-[240px] mx-auto">
                      {/* Invoice Print Icon Button */}
                      <button
                        type="button"
                        onClick={() => setInvoiceTicket(ticket)}
                        title={language === "ar" ? "طباعة فاتورة الصيانة والعميل" : "Print dynamic invoice"}
                        className="p-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit Details Icon Button */}
                      <button
                        type="button"
                        onClick={() => setEditingTicket(ticket)}
                        title={language === "ar" ? "تعديل الملف بالكامل" : "Edit full details"}
                        className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* View & Edit Operations Drawer */}
                      <button
                        onClick={() => handleOpenEdit(ticket)}
                        className="p-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all cursor-pointer"
                        title={language === "ar" ? "عرض وتعديل التفاصيل وبطاقة التكليف" : "Details & Technical dispatching"}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Share link to technical field mobile */}
                      <button
                        onClick={() => handleCopyPortalLink(ticket.id)}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          copiedId === ticket.id 
                            ? "bg-[#EDFAF1] text-[#1A7A4A] border border-[#1A7A4A]" 
                            : "bg-[#F5F7FA] text-[#6B7280] hover:bg-gray-200 border border-[#E2E6ED]"
                        }`}
                        title={t.copyPortalLink}
                      >
                        {copiedId === ticket.id ? (
                          <span className="text-[9px] font-bold">{language === "ar" ? "نسخ!" : "Copied!"}</span>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Delete Action confirmation dialog/button */}
                      {isDeletingId === ticket.id ? (
                        <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleDeleteTicket(ticket.id)}
                            disabled={actionLoading === ticket.id}
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
                          onClick={() => setIsDeletingId(ticket.id)}
                          title={language === "ar" ? "حذف الطلب والعميل" : "Remove data entry"}
                          className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    {t.noRecords}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editing & QA Review Sidebar/Modal Drawer */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50 animate-fade-in no-print" id="operations-drawer-back">
          <div 
            className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col justify-between overflow-y-auto"
            id="operations-drawer"
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-[#E2E6ED] flex justify-between items-center bg-[#F5F7FA]">
              <div>
                <span className="text-[10px] font-mono text-[#6B7280] block mb-0.5">{t.statusDetail}</span>
                <h3 className="text-lg font-bold text-[#111827] flex items-center gap-1.5 font-cairo">
                  <span>{selectedTicket.id}</span>
                  <span className="text-xs font-normal text-gray-500">|</span>
                  <span className="text-xs bg-[#EBF3FF] text-[#1A56DB] px-2 py-0.5 rounded">
                    {selectedTicket.category}
                  </span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicketId(null)}
                className="p-1 px-3 bg-white border border-[#E2E6ED] rounded-lg hover:bg-[#FFF0F0] hover:text-[#C0392B] text-xs font-bold shadow-xs cursor-pointer"
              >
                ✕ {language === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>

            {/* Drawer Body - Split into Status & Dispatch + Before/After QA Inspection */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* Customer Contact Card */}
              <div className="p-4 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider mb-2">
                  👤 {t.customerInfo}
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <span className="text-gray-400 block">{t.customerName}</span>
                    <span className="font-bold text-[#111827]">{selectedTicket.customerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">{t.customerPhone}</span>
                    <span className="font-mono text-[#111827]">{selectedTicket.customerPhone}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400 block">{t.customerLocation}</span>
                    <span className="text-[#111827]">{selectedTicket.customerLocation}</span>
                  </div>

                  {selectedTicket.latitude && selectedTicket.longitude && (
                    <div className="col-span-2 mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-[#6B7280] flex items-center gap-1 font-cairo">🗺️ {language === "ar" ? "الموقع الجغرافي الدقيق" : "Precise GPS Location Map"}</span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${selectedTicket.latitude},${selectedTicket.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-[#1A56DB] hover:underline hover:text-blue-700 font-bold font-cairo"
                        >
                          {language === "ar" ? "خرائط Google ↗" : "Google Maps ↗"}
                        </a>
                      </div>
                      <div className="h-36 w-full rounded-xl overflow-hidden border border-[#E2E6ED]">
                        <iframe 
                          title="Operation Ticket Map"
                          width="100%" 
                          height="100%" 
                          style={{ border: 0 }} 
                          allowFullScreen={false} 
                          loading="lazy" 
                          referrerPolicy="no-referrer"
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedTicket.customerLocation || "مصر")}&z=15&output=embed`}
                        ></iframe>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Maintenance Description */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase block">{language === "ar" ? "وصف البلاغ والشكوى المسجلة" : "Detailed Fault Log"}</span>
                <p className="text-xs leading-relaxed text-[#111827] bg-[#F5F7FA] p-3 rounded-lg border border-[#E2E6ED]">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Dispatch Action Controls */}
              <div className="space-y-4 border-t border-[#E2E6ED] pt-4">
                <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1">
                  <UserCheck className="w-4 h-4 text-[#1A56DB]" />
                  <span>{language === "ar" ? "إعادة توجيه وتعيين الكادر" : "Crew Dispatching & Phase Modification"}</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Crew Assign */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">{t.assignedTo}</label>
                    <select
                      value={updatingTech}
                      onChange={(e) => setUpdatingTech(e.target.value)}
                      className="w-full text-xs p-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl font-bold"
                    >
                      <option value="">{t.noTechAssigned}</option>
                      {selectTechs.map(tech => (
                        <option key={tech} value={tech}>{tech}</option>
                      ))}
                    </select>
                  </div>

                  {/* Cycle Status */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">{t.ticketStatus}</label>
                    <select
                      value={updatingStatus}
                      onChange={(e) => setUpdatingStatus(e.target.value as Ticket["status"])}
                      className="w-full text-xs p-2.5 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl font-bold"
                    >
                      <option value="Pending">{t.statPending}</option>
                      <option value="Assigned">{t.statAssigned}</option>
                      <option value="In Progress">{t.statInProgress}</option>
                      <option value="In QA Review">{t.statInQA}</option>
                      <option value="Closed">{t.statClosed}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tech Field Report Inspection (QA Block) */}
              {selectedTicket.fieldReport ? (
                <div className="border-t border-[#E2E6ED] pt-5 space-y-4">
                  <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1">
                    <ClipboardCheck className="w-4 h-4 text-amber-500" />
                    <span>{language === "ar" ? "فحص تقرير الصيانة وضمان الجودة" : "Field Specialist QA Inspection Panel"}</span>
                  </h4>

                  {/* Before / After visual checklist */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 block">{t.beforePhoto}</span>
                      {selectedTicket.fieldReport.beforeImage ? (
                        <img 
                          src={selectedTicket.fieldReport.beforeImage} 
                          alt="Before" 
                          referrerPolicy="no-referrer"
                          className="w-full h-32 object-cover rounded-xl border border-gray-200 shadow-xs"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-50 border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-[10px] text-gray-400">
                          {language === "ar" ? "لم ترفق صورة" : "No photo"}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 block">{t.afterPhoto}</span>
                      {selectedTicket.fieldReport.afterImage ? (
                        <img 
                          src={selectedTicket.fieldReport.afterImage} 
                          alt="After" 
                          referrerPolicy="no-referrer"
                          className="w-full h-32 object-cover rounded-xl border border-gray-200 shadow-xs"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-50 border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-[10px] text-gray-400">
                          {language === "ar" ? "لم ترفق صورة" : "No photo"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Extra Photos */}
                  {selectedTicket.fieldReport.photos && selectedTicket.fieldReport.photos.length > 0 && (
                    <div className="space-y-1 mt-4">
                      <span className="text-[10px] text-gray-400 block">{language === "ar" ? "صور إضافية" : "Additional Photos"}</span>
                      <div className="grid grid-cols-3 gap-3">
                        {selectedTicket.fieldReport.photos.map((photo, idx) => (
                          <img 
                            key={idx}
                            src={photo} 
                            alt={`Extra ${idx}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-24 object-cover rounded-xl border border-gray-200 shadow-xs"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Material Expenditures */}
                  <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 flex justify-between items-center text-xs">
                    <span className="font-semibold text-purple-950">{t.expenseCostLabel}</span>
                    <span className="font-mono font-bold text-sm text-purple-950 bg-white px-3 py-1 rounded-md shadow-xs">
                      {selectedTicket.expenseCost} {language === "ar" ? "ج.م" : "EGP"}
                    </span>
                  </div>

                  {/* Notes & Diagnostics feedback */}
                  <div className="bg-[#EDFAF1] p-3.5 rounded-xl border border-green-200 text-xs">
                    <span className="font-bold text-green-950 block mb-1">📝 {language === "ar" ? "تقرير معالجة الخبير الميداني:" : "Expert diagnostic summary:"}</span>
                    <p className="text-green-900 leading-relaxed italic">"{selectedTicket.fieldReport.completionNotes}"</p>
                  </div>

                  {/* Signature inspection */}
                  {selectedTicket.fieldReport.signature && (
                    <div className="space-y-1 bg-white p-3 border border-gray-200 rounded-xl">
                      <span className="text-[10px] text-gray-400 font-bold block">{t.signatureLabel}</span>
                      <div className="flex justify-center mt-2">
                        {selectedTicket.fieldReport.signature.startsWith("data:") ? (
                          <img 
                            src={selectedTicket.fieldReport.signature} 
                            alt="Signature" 
                            className="bg-gray-50 p-2 border rounded-md max-h-16"
                          />
                        ) : (
                          <div 
                            className="bg-gray-50 p-2 border rounded-md max-h-16 inline-block shrink-0"
                            dangerouslySetInnerHTML={{ __html: selectedTicket.fieldReport.signature }}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Instant QA validation options */}
                  {selectedTicket.status === "In QA Review" && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setUpdatingStatus("Closed");
                          handleQuickStatusChange(selectedTicket, "Closed");
                        }}
                        className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer transition-all flex items-center justify-center gap-1 shadow-xs"
                      >
                        <ShieldCheck className="w-4.5 h-4.5" />
                        <span>{t.closeTicket}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUpdatingStatus("In Progress");
                          handleQuickStatusChange(selectedTicket, "In Progress");
                        }}
                        className="p-3 bg-[#FFF0F0] border border-[#FADBD8] text-[#C0392B] rounded-xl font-bold cursor-pointer hover:bg-red-100 transition-all flex items-center justify-center gap-1"
                      >
                        <AlertTriangle className="w-4.5 h-4.5 animate-bounce" />
                        <span>{language === "ar" ? "إعادة للمراجعة الميدانية" : "Reject report (Retake)"}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800 flex items-center justify-center gap-1.5 leading-relaxed">
                  <AlertTriangle className="w-5 h-5 animate-pulse text-amber-500 shrink-0" />
                  <span>
                    {language === "ar" 
                      ? "بانتظار وصول التقرير الميداني وصور المطابقة من جهاز الفني المكلّف."
                      : "Awaiting diagnostic telemetry and Before/After assets upload from specialist's smart device."}
                  </span>
                </div>
              )}

              {/* Updates Timeline log */}
              <div className="border-t border-[#E2E6ED] pt-4 space-y-3">
                <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">{language === "ar" ? "سجل التتبع الزمني (جورنال التذكرة)" : "Incident Timeline Journal"}</span>
                <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                  {selectedTicket.updates.map((update, idx) => (
                    <div key={idx} className="border-l-2 border-blue-500 pl-3.5 space-y-1">
                      <p className="text-xs text-slate-800 leading-relaxed">{update.message}</p>
                      <div className="flex gap-2 text-[10px] text-gray-400">
                        <span className="font-bold text-slate-500">{update.author}</span>
                        <span>•</span>
                        <span className="font-mono">{new Date(update.timestamp).toLocaleTimeString(language === "ar" ? "ar-EG" : "en-US", {hour: "2-digit", minute: "2-digit"})}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* General Save parameters */}
            <div className="p-6 border-t border-[#E2E6ED] bg-[#F5F7FA] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedTicketId(null)}
                className="px-4 py-2 bg-white border border-[#E2E6ED] rounded-xl text-xs hover:bg-[#FFF0F0] hover:text-[#C0392B]"
              >
                ✕ {language === "ar" ? "ألغِ" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleSaveTicketUpdates}
                disabled={saveLoading}
                className="px-5 py-2.5 bg-[#1A56DB] hover:bg-[#1C51D3] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span>{saveLoading ? t.saving : (language === "ar" ? "حفظ التغييرات" : "Save Changes")}</span>
                <span>📋</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic notifications bar */}
      {notif && (
        <div className="fixed top-4 right-4 z-[100] bg-gray-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce border border-gray-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{notif}</span>
        </div>
      )}

      {/* Printable Invoice Page Styles */}
      <style>{`
        @media print {
          #operations-container > *:not(#invoice-bill-modal) {
            display: none !important;
          }
          #invoice-bill-modal {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            background: transparent !important;
            overflow: visible !important;
            display: block !important;
          }
          #invoice-bill-modal > div {
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
          #print-invoice-operations-content {
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

      {/* EDIT MODAL DIALOG POPUP */}
      {editingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in no-print-element" id="edit-ticket-modal">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#1A56DB]" />
                <h3 className="text-sm font-black text-gray-900 font-cairo">
                  {language === "ar" 
                    ? `تعديل الملف التعريفي والطلب: ${editingTicket.id}` 
                    : `Edit Patient Case Record: ${editingTicket.id}`}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingTicket(null)}
                className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg whitespace-nowrap"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Edit Fields Form */}
            <form onSubmit={handleUpdateTicket} className="space-y-4 font-cairo text-xs">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Edit Client Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{language === "ar" ? "اسم العميل / الجهة *" : "Customer Name *"}</label>
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
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{language === "ar" ? "رقم الهاتف / الجوال *" : "Mobile *"}</label>
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
                <label className="block text-xs font-semibold text-gray-600 mb-1">{language === "ar" ? "العنوان بالتفصيل *" : "Detailed Address *"}</label>
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
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{language === "ar" ? "نوع الصيانة والخدمة" : "Maintenance Specialty"}</label>
                  <select
                    value={editingTicket.category}
                    onChange={(e) => setEditingTicket({ ...editingTicket, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#1A56DB]"
                  >
                    {selectCats.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {language === "ar" ? `${cat.id} - ${cat.nameAr}` : `${cat.id} - ${cat.nameEn}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{language === "ar" ? "درجة الأهمية" : "Fault Urgency Level"}</label>
                  <select
                    value={editingTicket.priority}
                    onChange={(e) => setEditingTicket({ ...editingTicket, priority: e.target.value as Ticket["priority"] })}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#1A56DB]"
                  >
                    <option value="Critical">Critical - حرج جداً (SLA 2h)</option>
                    <option value="High">High - مرتفع (SLA 6h)</option>
                    <option value="Medium">Medium - متوسط (SLA 24h)</option>
                    <option value="Low">Low - منخفض الأولوية</option>
                  </select>
                </div>
              </div>

              {/* Maintenance description */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{language === "ar" ? "تفاصيل شكوى العميل ووصف العطل الفني *" : "Technical Log Message *"}</label>
                <textarea
                  required
                  rows={3}
                  value={editingTicket.description}
                  onChange={(e) => setEditingTicket({ ...editingTicket, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs focus:ring-1 focus:ring-[#1A56DB]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Scheduled Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{language === "ar" ? "تاريخ الزيارة المجدول" : "Scheduled Visit Date"}</label>
                  <input
                    type="date"
                    value={editingTicket.scheduledDate || ""}
                    onChange={(e) => setEditingTicket({ ...editingTicket, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#1A56DB]"
                  />
                </div>

                {/* Assigned Technician */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{language === "ar" ? "المهندس الفني المكلّف" : "Assigned Field specialist"}</label>
                  <select
                    value={editingTicket.assignedTechnician || ""}
                    onChange={(e) => setEditingTicket({ ...editingTicket, assignedTechnician: e.target.value || null })}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#1A56DB]"
                  >
                    <option value="">{t.noTechAssigned}</option>
                    {selectTechs.map(techName => (
                       <option key={techName} value={techName}>{techName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Editable cost */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  <span>{language === "ar" ? "تكلفة الصيانة والمشتريات الإجمالية (ج.م) *" : "Expense Material Cost (EGP) *"}</span>
                  <span className="text-[10px] text-gray-400 block font-normal mt-0.5">{language === "ar" ? "سيتم احتساب هذا المبلغ في الفاتورة المطبوعة والتحليلات والتقارير." : "This amount feeds into the dynamic layout."}</span>
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editingTicket.expenseCost}
                  onChange={(e) => setEditingTicket({ ...editingTicket, expenseCost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E6ED] rounded-xl text-xs font-mono font-bold text-green-700 focus:ring-1 focus:ring-[#1A56DB]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-250 text-gray-700 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  {language === "ar" ? "إلغاء الأمر" : "Dismiss"}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === editingTicket.id}
                  className="px-5 py-2 bg-[#1A56DB] hover:bg-[#1C51D3] text-white rounded-xl font-extrabold cursor-pointer transition-colors shadow-xs hover:shadow-md"
                >
                  {actionLoading === editingTicket.id ? (language === "ar" ? "جاري الحفظ..." : "Saving...") : (language === "ar" ? "تعديل وحفظ الملف بالكامل" : "Update Customer Record")}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DYNAMIC COMPREHENSIVE INVOICE PRINT MODAL */}
      {invoiceTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in" id="invoice-bill-modal">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-3xl w-full p-8 space-y-6 max-h-[92vh] overflow-y-auto relative">
            
            {/* INVOICE DESIGNED CONTAINER - TARGETED BY PRINT MEDIA ONLY */}
            <div id="print-invoice-operations-content" className="p-2 space-y-6 text-gray-900 bg-white font-cairo">
              {/* BRAND HEADER BAR */}
              <div className="flex justify-between items-start border-b-2 border-gray-900 pb-5">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-[#111827] flex items-center gap-1.5 uppercase font-sans">
                    <span className="bg-[#111827] text-white px-2 py-0.5 rounded-lg text-sm">ITQAN</span>
                    <span>{language === "ar" ? "إتقان التقنية للصيانة" : "ITQAN FIELD SLA"}</span>
                  </h1>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-xs font-medium">
                    {language === "ar" 
                      ? "إتقان المحدودة للتشغيل والصيانة الميدانية المتكاملة بمصر" 
                      : "Corporate maintenance, facilities administration & smart diagnostic SLA reports."}
                  </p>
                  <p className="text-[9px] text-gray-500 font-mono mt-0.5">Cairo, Egypt | support@itqan-fsm.com | +20 (0) 1000000000</p>
                </div>

                <div className="text-right flex flex-col items-end">
                  <span className="text-xs bg-[#1A56DB] text-white px-3 py-1 rounded-full font-bold uppercase tracking-wider mb-2 font-sans">{language === "ar" ? "فاتورة صيانة" : "SLA invoice receipt"}</span>
                  <span className="text-[10px] text-gray-400 font-semibold">{language === "ar" ? "رقم الفاتورة الموحد" : "TAX INVOICE CODE:"}</span>
                  <span className="text-sm font-mono font-black text-gray-900">INV-{invoiceTicket.id}</span>
                </div>
              </div>

              {/* METADATA CHANNELS */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-gray-700 text-right md:text-start rtl:text-right">
                <div className="space-y-1">
                  <span className="block text-[10px] text-gray-400 font-bold uppercase">{language === "ar" ? "العميل والمستلم المعتمد" : "Invoiced Participant:"}</span>
                  <span className="font-extrabold text-gray-900 text-sm block">{invoiceTicket.customerName}</span>
                  <span className="font-mono text-gray-600 block">📞 {invoiceTicket.customerPhone}</span>
                </div>

                <div className="space-y-1">
                  <span className="block text-[10px] text-gray-400 font-bold uppercase">{language === "ar" ? "التاريخ والحالة" : "Issued On:"}</span>
                  <span className="font-semibold text-gray-700">
                    {new Date(invoiceTicket.createdAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
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

              {/* PHOTOS / IMAGES */}
              {(invoiceTicket.fieldReport?.beforeImage || invoiceTicket.fieldReport?.afterImage || (invoiceTicket.fieldReport?.photos && invoiceTicket.fieldReport.photos.length > 0)) && (
                <div className="mt-8 border-t border-gray-100 pt-6">
                  <h4 className="text-[10px] text-gray-400 font-bold uppercase mb-4 text-center">
                    {language === "ar" ? "التوثيق المرئي والأدلة الفنية" : "Visual Technical Documentation"}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {invoiceTicket.fieldReport.beforeImage && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-gray-500 font-semibold block text-center">
                          {language === "ar" ? "الصورة قبل الصيانة" : "Before Maintenance condition"}
                        </span>
                        <img 
                          src={invoiceTicket.fieldReport.beforeImage} 
                          alt="Before" 
                          className="w-full h-auto rounded-lg border border-gray-200" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    {invoiceTicket.fieldReport.afterImage && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-gray-500 font-semibold block text-center">
                          {language === "ar" ? "الصورة بعد الصيانة" : "After Maintenance condition"}
                        </span>
                        <img 
                          src={invoiceTicket.fieldReport.afterImage} 
                          alt="After" 
                          className="w-full h-auto rounded-lg border border-gray-200"
                          referrerPolicy="no-referrer" 
                        />
                      </div>
                    )}
                  </div>

                  {/* Extra Photos */}
                  {invoiceTicket.fieldReport?.photos && invoiceTicket.fieldReport.photos.length > 0 && (
                    <div className="mt-6">
                      <span className="text-[9px] text-gray-500 font-semibold block text-center mb-2">
                        {language === "ar" ? "صور إضافية" : "Additional Photos"}
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        {invoiceTicket.fieldReport.photos.map((photo, idx) => (
                          <img 
                            key={idx}
                            src={photo} 
                            alt={`Extra ${idx}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                            referrerPolicy="no-referrer" 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                  ? "شكراً لتعاملكم مع إتقان لخدمات الصيانة الميدانية بمصر. يُرجى الاحتفاظ بهذه الفاتورة لجميع خدمات الضمان والمتابعة والتدقيق الفني مستقبلاً." 
                  : "Thank you for partnering with Itqan FSM Egypt. Please secure this diagnostic slip as valid warranty reference for future inspections."}
              </p>

            </div>

            {/* Modal Internal Footer controls */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3 no-print-element font-cairo">
              <button
                type="button"
                onClick={() => setInvoiceTicket(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                ✕ {language === "ar" ? "إغلاق النافذة" : "Close Screen"}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{language === "ar" ? "اطبع الفاتورة الآن (أو احفظ كـ PDF)" : "Send to System Printer (Save PDF)"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
