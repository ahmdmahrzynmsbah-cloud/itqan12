import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { translations } from "../utils/translations";
import { socket } from "../socket";
import { Plus, Search, FileText, Download, CheckCircle2, XCircle, Clock, MoreHorizontal, FileDown, UploadCloud, ImageIcon, Paperclip, Printer, Edit2, Trash2 } from "lucide-react";

interface QuotationAttachment {
  name: string;
  type: string;
  dataUrl: string;
}

interface Quotation {
  id: string;
  code: string;
  date: string;
  requestedBy: string;
  status: "Pending" | "Approved" | "Rejected";
  approvalDetails: string;
  attachmentsCount: number;
  attachments?: QuotationAttachment[];
  totalAmount: number;
  nextInvoiceDate?: string;
}

interface QuotationsModuleProps {
  language: "ar" | "en";
}

export default function QuotationsModule({ language }: QuotationsModuleProps) {
  const t = translations[language];
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const [newAttachments, setNewAttachments] = useState<QuotationAttachment[]>([]);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ 
    contentRef: printRef,
    pageStyle: `@media print { body { -webkit-print-color-adjust: exact; } } @page { size: A4 portrait; margin: 10mm; }`
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      Promise.all(files.map((file: File) => {
        return new Promise<QuotationAttachment>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              name: file.name,
              type: file.type,
              dataUrl: event.target?.result as string
            });
          };
          reader.readAsDataURL(file);
        });
      })).then(results => {
        setNewAttachments(prev => [...prev, ...results]);
      });
    }
  };

  const generateCode = () => {
    return 'QT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  };

  const [loading, setLoading] = useState(true);

  // Load from both API and localStorage cache
  useEffect(() => {
    // 1. Initial quick load from local storage cache if available
    const saved = localStorage.getItem("itqan_quotations");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setQuotations(parsed);
        }
      } catch (e) {}
    }

    // 2. Load centralized fresh data from API
    fetch("/api/quotations")
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("API failed");
      })
      .then(data => {
        if (data && Array.isArray(data)) {
          setQuotations(data);
        }
      })
      .catch(err => {
        console.warn("Centralized quotations backend offline. Reverting to cached local ledger.", err);
      })
      .finally(() => {
        setLoading(false);
      });

    // 3. Listen to Socket.io real-time broadcast update events
    socket.on("quotationsUpdated", (quotationsList: Quotation[]) => {
      setQuotations(quotationsList);
      setSelectedQuote(prev => {
        if (!prev) return null;
        const matched = quotationsList.find(q => q.id === prev.id);
        return matched || null;
      });
    });

    return () => {
      socket.off("quotationsUpdated");
    };
  }, []);

  // Save to local storage cache with robust try-catch
  useEffect(() => {
    try {
      localStorage.setItem("itqan_quotations", JSON.stringify(quotations));
    } catch (e) {
      console.warn("Local storage cache write failed (possibly exceeded 5MB size quota due to attachments). Operational state remains fully updated in memory.", e);
    }
  }, [quotations]);

  const filteredQuotes = quotations.filter(
    (q) =>
      q.code.toLowerCase().includes(search.toLowerCase()) ||
      q.requestedBy.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Rejected": return "bg-rose-50 text-rose-700 border-rose-200";
      default: return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved": return <CheckCircle2 className="w-4 h-4" />;
      case "Rejected": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className={`p-6 max-w-7xl mx-auto font-cairo ${language === "ar" ? "text-right" : "text-left"}`}>
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            {t.quotationsTitle || "Quotations"}
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            {t.quotationsSubtitle || "Manage price quotes, approvals, and attached invoices/reports."}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className={`absolute ${language === "ar" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4`} />
            <input
              type="text"
              placeholder={t.searchPlaceholder || "Search..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full ${language === "ar" ? "pl-4 pr-10" : "pl-10 pr-4"} py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm font-medium`}
            />
          </div>
          <button 
            onClick={() => {
              setGeneratedCode(generateCode());
              setEditingQuote(null);
              setNewAttachments([]);
              setIsAddOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addQuotation || "Add New Quotation"}</span>
          </button>
        </div>
      </div>

      {/* Modern Luxurious Table Card */}
      <div className="bg-white border text-sm border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col relative z-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[11px] font-extrabold whitespace-nowrap">
                <th className={`px-6 py-4 ${language === "ar" ? "text-right" : "text-left"}`}>{t.quotationCode || "Code"}</th>
                <th className={`px-6 py-4 ${language === "ar" ? "text-right" : "text-left"}`}>{t.quotationDate || "Date"}</th>
                <th className={`px-6 py-4 ${language === "ar" ? "text-right" : "text-left"}`}>{t.nextInvoiceDateLabel || "Next Invoice Date"}</th>
                <th className={`px-6 py-4 ${language === "ar" ? "text-right" : "text-left"}`}>{t.requestedBy || "Requested By"}</th>
                <th className={`px-6 py-4 ${language === "ar" ? "text-right" : "text-left"}`}>{t.quotationStatus || "Status"}</th>
                <th className={`px-6 py-4 ${language === "ar" ? "text-right" : "text-left"}`}>{t.approvalDetails || "Approval Details"}</th>
                <th className={`px-6 py-4 text-center`}>{t.attachments || "Attachments"}</th>
                <th className={`px-4 py-4 text-center`}>{language === "ar" ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotes.length > 0 ? (
                filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md text-xs border border-slate-200">{q.code}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                      {q.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-indigo-600 font-bold">
                      {q.nextInvoiceDate || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-800 font-bold">
                      {q.requestedBy}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border shadow-sm ${getStatusColor(q.status)}`}>
                        {getStatusIcon(q.status)}
                        <span className="mb-0.5">{q.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="max-w-xs truncate font-medium" title={q.approvalDetails}>
                        {q.approvalDetails || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-slate-200 cursor-pointer">
                        <FileDown className="w-3.5 h-3.5" />
                        <span className="mb-0.5">{q.attachmentsCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQuote(q);
                          }}
                          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title={language === "ar" ? "عرض" : "View"}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingQuote(q);
                            setNewAttachments(q.attachments || []);
                            setIsAddOpen(true);
                          }}
                          className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title={language === "ar" ? "تعديل" : "Edit"}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQuote(q);
                            setTimeout(() => {
                              handlePrint();
                            }, 100);
                          }}
                          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title={language === "ar" ? "طباعة" : "Print"}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            // Optimistic UI update
                            setQuotations(prev => prev.filter(item => item.id !== q.id));
                            // Delete from cloud DB
                            fetch(`/api/quotations/${q.id}`, {
                              method: "DELETE"
                            }).catch(err => console.error("Could not sync delete to cloud DB:", err));
                          }}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={language === "ar" ? "حذف" : "Delete"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FileText className="w-12 h-12 text-slate-300" />
                      <p className="font-bold">{t.noRecords || "No records found"}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Quotation Modal Overlay */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col font-cairo">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-800">
                {editingQuote ? (language === "ar" ? "تعديل عرض السعر" : "Edit Quotation") : (t.addQuotation || "Add New Quotation")}
              </h3>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors cursor-pointer"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form 
              className="p-6 overflow-y-auto max-h-[70vh] flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updatedQuote: Quotation = {
                  id: editingQuote ? editingQuote.id : Date.now().toString(),
                  code: formData.get("code") as string,
                  date: formData.get("date") as string,
                  requestedBy: formData.get("requestedBy") as string,
                  status: formData.get("status") as any,
                  approvalDetails: formData.get("approvalDetails") as string,
                  attachmentsCount: newAttachments.length,
                  attachments: newAttachments,
                  totalAmount: Number(formData.get("totalAmount") || 0),
                  nextInvoiceDate: formData.get("nextInvoiceDate") as string || ""
                };
                if (editingQuote) {
                  // Optimistic UI state update
                  setQuotations(prev => prev.map(q => q.id === editingQuote.id ? updatedQuote : q));
                  // Save to cloud database via API
                  fetch(`/api/quotations/${editingQuote.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatedQuote)
                  }).catch(err => console.error("Could not sync updated quotation to cloud DB:", err));
                } else {
                  // Optimistic UI state update
                  setQuotations(prev => [updatedQuote, ...prev]);
                  // Save to cloud database via API
                  fetch("/api/quotations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatedQuote)
                  }).catch(err => console.error("Could not sync new quotation to cloud DB:", err));
                }
                setIsAddOpen(false);
                setNewAttachments([]);
                setEditingQuote(null);
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {t.quotationCode || "Code / ID"}
                  </label>
                  <input required name="code" type="text" readOnly defaultValue={editingQuote ? editingQuote.code : generatedCode} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-50 text-slate-600 outline-none" />
                </div>
                
                <input name="totalAmount" type="hidden" defaultValue={editingQuote?.totalAmount || 0} />

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {t.quotationDate || "Date"}
                  </label>
                  <input required name="date" type="date" defaultValue={editingQuote ? editingQuote.date : new Date().toISOString().split("T")[0]} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {t.requestedBy || "Requested By"}
                  </label>
                  <input required name="requestedBy" type="text" defaultValue={editingQuote?.requestedBy} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Name" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {t.quotationStatus || "Status"}
                  </label>
                  <select name="status" defaultValue={editingQuote?.status || "Pending"} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {t.nextInvoiceDateLabel || "Next Invoice Date"}
                  </label>
                  <input name="nextInvoiceDate" type="date" defaultValue={editingQuote?.nextInvoiceDate || ""} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
              </div>

              <div className="space-y-2 mt-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  {t.approvalDetails || "Approval Details"}
                </label>
                <textarea name="approvalDetails" rows={3} defaultValue={editingQuote?.approvalDetails} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-slate-400" placeholder="Signatures, notes, conditions..." />
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  {t.attachments || "Attachments"}
                </label>
                
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative">
                  <input 
                    type="file" 
                    multiple 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  />
                  <div className="bg-blue-50 text-blue-600 p-3 rounded-full mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">{language === "ar" ? "اسحب وأفلت الملفات هنا أو اضغط للاختيار" : "Drag & drop files here or click to browse"}</p>
                  <p className="text-xs text-slate-400 mt-1">{language === "ar" ? "يدعم الصور، PDF، وملفات أخرى" : "Supports images, PDFs, and other files"}</p>
                </div>

                {newAttachments.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    {newAttachments.map((att, idx) => (
                      <div key={idx} className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center h-20">
                        {att.type.startsWith('image/') ? (
                          <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-2 text-slate-500">
                            <FileText className="w-6 h-6 mb-1" />
                            <span className="text-[10px] w-full truncate text-center font-medium px-1">{att.name}</span>
                          </div>
                        )}
                        <button 
                          type="button"
                          onClick={() => setNewAttachments(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {t.saveQuotation || "Save Quotation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View/Details Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedQuote(null);
        }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col font-cairo">
            
            {/* The wrapper area to print */}
            <div ref={printRef} className="flex flex-col w-full bg-white max-h-[70vh] overflow-y-auto print:max-h-none print:overflow-visible">
              <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 print:bg-white print:border-b-2 print:border-slate-800">
                <div>
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600 print:text-black" />
                    {t.viewQuotation || "View Quotation Details"}
                  </h3>
                  <span className="font-mono text-sm text-slate-500 font-bold tracking-wide mt-1 block">{selectedQuote.code}</span>
                </div>
                <button 
                  onClick={() => setSelectedQuote(null)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-white p-2 rounded-lg transition-colors cursor-pointer shadow-sm print:hidden"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-6 print:border-slate-800">
                  <div>
                    {/* Price/Total Amount hidden as requested */}
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold border shadow-sm print:border-slate-300 print:shadow-none ${getStatusColor(selectedQuote.status)}`}>
                      {getStatusIcon(selectedQuote.status)}
                      <span>{selectedQuote.status}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-transparent print:border-slate-300">
                    <h4 className="text-xs font-bold tracking-wide text-slate-500 uppercase">{t.quotationDate || "Date"}</h4>
                    <p className="text-slate-800 font-bold mt-1 text-lg">{selectedQuote.date}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-transparent print:border-slate-300">
                    <h4 className="text-xs font-bold tracking-wide text-slate-500 uppercase">{t.requestedBy || "Requested By"}</h4>
                    <p className="text-slate-800 font-bold mt-1 text-lg">{selectedQuote.requestedBy}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-transparent print:border-slate-300 col-span-2 md:col-span-1">
                    <h4 className="text-xs font-bold tracking-wide text-slate-500 uppercase">{t.nextInvoiceDateLabel || "Next Invoice Date"}</h4>
                    <p className="text-indigo-600 font-black mt-1 text-lg">{selectedQuote.nextInvoiceDate || "—"}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold tracking-wide text-slate-500 uppercase mb-2">{t.approvalDetails || "Approval Details"}</h4>
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-900 font-medium whitespace-pre-wrap leading-relaxed print:bg-transparent print:border-slate-300 print:text-black">
                    {selectedQuote.approvalDetails || "—"}
                  </div>
                </div>

                <div className="print:hidden">
                  <h4 className="text-xs font-bold tracking-wide text-slate-500 uppercase mb-2">{t.attachments || "Attachments"}</h4>
                  
                  {selectedQuote.attachments && selectedQuote.attachments.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                      {selectedQuote.attachments.map((att, idx) => (
                        <a 
                          key={idx} 
                          href={att.dataUrl} 
                          download={att.name}
                          className="group flex flex-col rounded-xl border border-slate-200 overflow-hidden bg-white hover:border-blue-300 transition-colors shadow-sm"
                        >
                          <div className="h-24 bg-slate-50 flex flex-col items-center justify-center relative">
                            {att.type.startsWith('image/') ? (
                              <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-slate-400 group-hover:text-blue-500 transition-colors">
                                <FileText className="w-8 h-8" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Download className="w-6 h-6 text-white" />
                            </div>
                          </div>
                          <div className="p-2 border-t border-slate-100 text-xs text-center font-medium text-slate-600 truncate px-2" title={att.name}>
                            {att.name}
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors border border-slate-200 cursor-pointer">
                        <FileDown className="w-4 h-4" />
                        <span>{selectedQuote.attachmentsCount} {language === "ar" ? "مرفقات متاحة" : "Files Attached"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handlePrint()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    {language === "ar" ? "طباعة" : "Print"}
                  </button>
                  <button 
                    onClick={() => {
                      setEditingQuote(selectedQuote);
                      setNewAttachments(selectedQuote.attachments || []);
                      setSelectedQuote(null);
                      setIsAddOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                    {language === "ar" ? "تعديل" : "Edit"}
                  </button>
                  <button 
                    onClick={() => {
                      if (selectedQuote) {
                        // Optimistic UI update
                        setQuotations(prev => prev.filter(q => q.id !== selectedQuote.id));
                        // Delete from cloud DB
                        fetch(`/api/quotations/${selectedQuote.id}`, {
                          method: "DELETE"
                        }).catch(err => console.error("Could not sync delete to cloud DB:", err));
                        setSelectedQuote(null);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    {language === "ar" ? "حذف" : "Delete"}
                  </button>
                </div>
                <button type="button" onClick={() => setSelectedQuote(null)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer">
                  {language === "ar" ? "إغلاق" : "Close"}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
