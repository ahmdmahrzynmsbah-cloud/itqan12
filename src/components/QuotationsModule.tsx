import React, { useState, useEffect } from "react";
import { translations } from "../utils/translations";
import { socket } from "../socket";
import { Plus, Search, Trash2, Loader2, CheckCircle2 } from "lucide-react";

interface Quotation {
  id: string;
  code: string;
  date: string;
  requestedBy: string;
  status: "Pending" | "Approved" | "Rejected" | string;
  approvalDetails: string;
  attachmentsCount: number;
  totalAmount: number;
  nextInvoiceDate?: string;
  
  // Spreadsheet Fields
  srl?: string;
  companyName?: string;
  contact?: string;
  reference?: string;
  propertyName?: string;
  location?: string;
  type?: string;
  brand?: string;
  requestType?: string;
  
  inspectionDate?: string;
  inspectionDetailsText?: string;
  inspectedBy?: string;
  
  quotationDate?: string;
  quotationRefNo?: string;
  quotationStatus?: string;
  
  invoiceNo?: string;
  invoiceDate?: string;
  
  paymentDate?: string;
  paymentRvNo?: string;
  
  ageDays?: string;
}

interface QuotationsModuleProps {
  language: "ar" | "en";
}

export default function QuotationsModule({ language }: QuotationsModuleProps) {
  const t = translations[language];
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingRows, setSavingRows] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const saved = localStorage.getItem("itqan_quotations");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setQuotations(parsed);
      } catch (e) {}
    }

    fetch("/api/quotations")
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) setQuotations(data);
      })
      .finally(() => setLoading(false));

    socket.on("quotationsUpdated", (data: Quotation[]) => {
      setQuotations(data);
    });

    return () => {
      socket.off("quotationsUpdated");
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("itqan_quotations", JSON.stringify(quotations));
    } catch (e) {}
  }, [quotations]);

  const saveRowToDb = async (row: Quotation) => {
    setSavingRows(prev => ({ ...prev, [row.id]: true }));
    try {
      await fetch(`/api/quotations/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row)
      });
    } catch (err) {
      console.error("Failed to save row", err);
    } finally {
      setTimeout(() => {
        setSavingRows(prev => ({ ...prev, [row.id]: false }));
      }, 500);
    }
  };

  const handleCellChange = (id: string, field: keyof Quotation, value: string) => {
    setQuotations(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const addRow = async () => {
    const newSrl = (quotations.length + 1).toString();
    const newRow: Quotation = {
      id: Date.now().toString(),
      code: `QT-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      requestedBy: "",
      status: "Pending",
      approvalDetails: "",
      attachmentsCount: 0,
      totalAmount: 0,
      srl: newSrl,
      companyName: "",
      contact: "",
      reference: "",
      propertyName: "",
      location: "",
      type: "",
      brand: "",
      requestType: "",
      inspectionDate: "",
      inspectionDetailsText: "",
      inspectedBy: "",
      quotationDate: "",
      quotationRefNo: "",
      quotationStatus: "",
      invoiceNo: "",
      invoiceDate: "",
      paymentDate: "",
      paymentRvNo: "",
      ageDays: ""
    };
    
    setQuotations(prev => [...prev, newRow]);
    
    try {
      await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRow)
      });
    } catch (err) {
      console.error("Error creating row", err);
    }
  };

  const deleteRow = async (id: string) => {
    setQuotations(prev => prev.filter(q => q.id !== id));
    try {
      await fetch(`/api/quotations/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Error deleting row", err);
    }
  };

  const filteredQuotes = quotations.filter(q => 
    (q.companyName || "").toLowerCase().includes(search.toLowerCase()) ||
    (q.reference || "").toLowerCase().includes(search.toLowerCase()) ||
    (q.propertyName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`p-2 w-full max-w-full mx-auto font-cairo ${language === "ar" ? "text-right" : "text-left"}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-2">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            {language === "ar" ? "جدول أوامر العمل (عروض الأسعار)" : "Work Order Sheet (Quotations)"}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {language === "ar" ? "جدول بيانات شامل للتعديل المباشر كأنه إكسيل" : "Comprehensive spreadsheet for live inline editing like Excel"}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className={`absolute ${language === "ar" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4`} />
            <input
              type="text"
              placeholder={language === "ar" ? "بحث..." : "Search..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full ${language === "ar" ? "pl-4 pr-10" : "pl-10 pr-4"} py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm`}
            />
          </div>
          <button 
            onClick={addRow}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{language === "ar" ? "إضافة صف جديد" : "Add Row"}</span>
          </button>
        </div>
      </div>

      <div className="bg-white border text-sm border-slate-300 rounded-xl shadow-sm overflow-hidden flex flex-col relative w-full mt-4">
        <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent pb-4" dir="ltr">
          <table className="w-full text-left border-collapse" style={{ minWidth: "2400px" }}>
            <thead>
              {/* TOP HEADER ROW FOR GROUPING */}
              <tr className="bg-[#2D6A76] text-white tracking-wider text-[13px] font-black border-b border-white border-opacity-20 text-center">
                <th colSpan={5} className="border-r border-white border-opacity-20 py-2 shadow-sm">
                  {language === "ar" ? "تفاصيل العميل - Client Details" : "Client Details"}
                </th>
                <th colSpan={6} className="border-r border-white border-opacity-20 py-2 shadow-sm bg-[#2D6A76]">
                  {language === "ar" ? "تفاصيل الاستفسار - Inquiry Details" : "Inquiry Details"}
                </th>
                <th colSpan={3} className="border-r border-white border-opacity-20 py-2 shadow-sm bg-[#0e4e5a]">
                  {language === "ar" ? "تفاصيل المعاينة - Inspection Details" : "Inspection Details"}
                </th>
                <th colSpan={3} className="border-r border-white border-opacity-20 py-2 shadow-sm bg-[#b43f36]">
                  {language === "ar" ? "عرض السعر - Quotation" : "Quotation"}
                </th>
                <th colSpan={2} className="border-r border-white border-opacity-20 py-2 shadow-sm bg-[#1e4c70]">
                  {language === "ar" ? "الفاتورة - Invoice" : "Invoice"}
                </th>
                <th colSpan={2} className="border-r border-white border-opacity-20 py-2 shadow-sm bg-[#2b6a48]">
                  {language === "ar" ? "الدفع - Payment" : "Payment"}
                </th>
                <th className="border-r border-white border-opacity-20 py-2 shadow-sm bg-[#8a2e2e]">
                  {language === "ar" ? "عمر الوثيقة" : "Age"}
                </th>
                <th className="py-2 w-16">{language === "ar" ? "الإجراء" : "Action"}</th>
              </tr>
              {/* SECOND HEADER ROW FOR COLUMNS */}
              <tr className="bg-[#3A8F9E] text-white tracking-wider text-[11px] font-bold whitespace-nowrap text-center">
                <th className="border border-white border-opacity-20 px-2 py-2 w-12">Srl</th>
                <th className="border border-white border-opacity-20 px-2 py-2 w-56">Company Name</th>
                <th className="border border-white border-opacity-20 px-2 py-2 w-32">Requested by</th>
                <th className="border border-white border-opacity-20 px-2 py-2 w-32">Contact</th>
                
                <th className="border border-white border-opacity-20 px-2 py-2 w-28">Reference</th>
                
                <th className="border border-white border-opacity-20 px-2 py-2 w-32">Date</th>
                <th className="border border-white border-opacity-20 px-2 py-2 w-56">Property Name</th>
                <th className="border border-white border-opacity-20 px-2 py-2 w-32">Location</th>
                <th className="border border-white border-opacity-20 px-2 py-2 w-28">Type</th>
                <th className="border border-white border-opacity-20 px-2 py-2 w-28">Brand</th>
                <th className="border border-white border-opacity-20 px-2 py-2 w-40 border-r-2 border-r-slate-400">Request Type</th>
                
                {/* Inspection Details */}
                <th className="border border-white border-opacity-20 px-2 py-2 w-32 bg-[#176a78]">Date</th>
                <th className="border border-white border-opacity-20 px-2 py-2 w-56 bg-[#176a78]">Details</th>
                <th className="border border-white border-opacity-20 px-2 py-2 w-40 bg-[#176a78] border-r-2 border-r-slate-400">Inspected by</th>
                
                {/* Quotation */}
                <th className="border border-white border-opacity-20 px-2 py-2 w-32 bg-[#c54b41]">Date</th>
                <th className="border border-white border-opacity-20 px-2 py-2 w-40 bg-[#c54b41]">Ref. No.</th>
                <th className="border border-white border-opacity-20 px-2 py-2 w-32 bg-[#c54b41] border-r-2 border-r-slate-400">Status</th>
                
                {/* Invoice */}
                <th className="border border-white border-opacity-20 px-2 py-2 w-40 bg-[#2b5e85]">Invoice No.</th>
                <th className="border border-white border-opacity-20 px-2 py-2 w-32 bg-[#2b5e85] border-r-2 border-r-slate-400">Date</th>
                
                {/* Payment */}
                <th className="border border-white border-opacity-20 px-2 py-2 w-32 bg-[#3a855d]">Date</th>
                <th className="border border-white border-opacity-20 px-2 py-2 w-40 bg-[#3a855d] border-r-2 border-r-slate-400">RV No.</th>

                {/* Age */}
                <th className="border border-white border-opacity-20 px-2 py-2 w-24 bg-[#b33e3e]">Days</th>

                <th className="border border-white border-opacity-20 px-2 py-2 w-16 text-center">Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {filteredQuotes.length > 0 ? (
                filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-blue-50/50 transition-colors group text-xs text-slate-800">
                    <td className="border border-slate-300 p-0">
                      <input 
                        type="text" 
                        value={q.srl || ""} 
                        onChange={(e) => handleCellChange(q.id, 'srl', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-blue-400 text-center font-medium"
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input 
                        type="text" 
                        value={q.companyName || ""} 
                        onChange={(e) => handleCellChange(q.id, 'companyName', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-blue-400 font-bold"
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input 
                        type="text" 
                        value={q.requestedBy || ""} 
                        onChange={(e) => handleCellChange(q.id, 'requestedBy', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input 
                        type="text" 
                        value={q.contact || ""} 
                        onChange={(e) => handleCellChange(q.id, 'contact', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-blue-400"
                      />
                    </td>

                    <td className="border border-slate-300 p-0 bg-slate-50/50 border-r-2 border-r-slate-400">
                      <input 
                        type="text" 
                        value={q.reference || ""} 
                        onChange={(e) => handleCellChange(q.id, 'reference', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-blue-400 font-mono text-xs font-bold text-slate-600"
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input 
                        type="date" 
                        value={q.date || ""} 
                        onChange={(e) => handleCellChange(q.id, 'date', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-blue-400 font-medium"
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input 
                        type="text" 
                        value={q.propertyName || ""} 
                        onChange={(e) => handleCellChange(q.id, 'propertyName', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-blue-400 font-bold"
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input 
                        type="text" 
                        value={q.location || ""} 
                        onChange={(e) => handleCellChange(q.id, 'location', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input 
                        type="text" 
                        value={q.type || ""} 
                        onChange={(e) => handleCellChange(q.id, 'type', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input 
                        type="text" 
                        value={q.brand || ""} 
                        onChange={(e) => handleCellChange(q.id, 'brand', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="border border-slate-300 p-0 border-r-2 border-r-slate-400">
                      <input 
                        type="text" 
                        value={q.requestType || ""} 
                        onChange={(e) => handleCellChange(q.id, 'requestType', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    
                    {/* Inspection Details */}
                    <td className="border border-slate-300 p-0">
                      <input 
                        type="date" 
                        value={q.inspectionDate || ""} 
                        onChange={(e) => handleCellChange(q.id, 'inspectionDate', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-blue-400 font-medium text-xs"
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input 
                        type="text" 
                        value={q.inspectionDetailsText || ""} 
                        onChange={(e) => handleCellChange(q.id, 'inspectionDetailsText', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="border border-slate-300 p-0 border-r-2 border-r-slate-400">
                      <input 
                        type="text" 
                        value={q.inspectedBy || ""} 
                        onChange={(e) => handleCellChange(q.id, 'inspectedBy', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-blue-400"
                      />
                    </td>

                    {/* Quotation */}
                    <td className="border border-slate-300 p-0 bg-rose-50/20">
                      <input 
                        type="date" 
                        value={q.quotationDate || ""} 
                        onChange={(e) => handleCellChange(q.id, 'quotationDate', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-rose-50 focus:ring-1 focus:ring-rose-400 font-medium text-xs"
                      />
                    </td>
                    <td className="border border-slate-300 p-0 bg-rose-50/20">
                      <input 
                        type="text" 
                        value={q.quotationRefNo || ""} 
                        onChange={(e) => handleCellChange(q.id, 'quotationRefNo', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-rose-50 focus:ring-1 focus:ring-rose-400 font-mono text-xs font-bold text-slate-800"
                      />
                    </td>
                    <td className="border border-slate-300 p-0 bg-rose-50/20 border-r-2 border-r-slate-400">
                      <input 
                        type="text" 
                        value={q.quotationStatus || ""} 
                        onChange={(e) => handleCellChange(q.id, 'quotationStatus', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-rose-50 focus:ring-1 focus:ring-rose-400 font-bold"
                      />
                    </td>

                    {/* Invoice */}
                    <td className="border border-slate-300 p-0 bg-blue-50/20">
                      <input 
                        type="text" 
                        value={q.invoiceNo || ""} 
                        onChange={(e) => handleCellChange(q.id, 'invoiceNo', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 font-mono text-xs font-bold text-slate-800"
                      />
                    </td>
                    <td className="border border-slate-300 p-0 bg-blue-50/20 border-r-2 border-r-slate-400">
                      <input 
                        type="date" 
                        value={q.invoiceDate || ""} 
                        onChange={(e) => handleCellChange(q.id, 'invoiceDate', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 font-medium text-xs"
                      />
                    </td>

                    {/* Payment */}
                    <td className="border border-slate-300 p-0 bg-emerald-50/20">
                      <input 
                        type="date" 
                        value={q.paymentDate || ""} 
                        onChange={(e) => handleCellChange(q.id, 'paymentDate', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-emerald-50 focus:ring-1 focus:ring-emerald-400 font-medium text-xs"
                      />
                    </td>
                    <td className="border border-slate-300 p-0 bg-emerald-50/20 border-r-2 border-r-slate-400">
                      <input 
                        type="text" 
                        value={q.paymentRvNo || ""} 
                        onChange={(e) => handleCellChange(q.id, 'paymentRvNo', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-emerald-50 focus:ring-1 focus:ring-emerald-400 font-mono text-xs font-bold text-slate-800"
                      />
                    </td>

                    {/* Age */}
                    <td className="border border-slate-300 p-0 bg-red-50/20">
                      <input 
                        type="text" 
                        value={q.ageDays || ""} 
                        onChange={(e) => handleCellChange(q.id, 'ageDays', e.target.value)}
                        onBlur={() => saveRowToDb(q)}
                        className="w-full h-full px-2 py-2.5 bg-transparent outline-none focus:bg-red-50 focus:ring-1 focus:ring-red-400 font-mono text-xs font-bold text-center text-red-700"
                      />
                    </td>

                    <td className="border border-slate-300 p-1 text-center bg-slate-50/50">
                      <div className="flex items-center justify-center gap-1">
                        {savingRows[q.id] ? (
                          <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                        ) : (
                          <div className="w-3.5 h-3.5 text-emerald-500/70" title="Saved">
                             <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <button 
                          onClick={() => deleteRow(q.id) }
                          className="text-slate-300 hover:text-rose-500 transition-colors p-0.5"
                          title={language === "ar" ? "حذف" : "Delete"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-500 bg-slate-50 font-medium">
                    {language === "ar" ? "لا يوجد بيانات. اضغط على 'إضافة صف جديد' للبدء." : "No records found. Click 'Add Row' to start."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
