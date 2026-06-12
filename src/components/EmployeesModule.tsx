import React, { useState, useEffect } from "react";
import { 
  UserCheck, 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  AlertTriangle, 
  Check, 
  Edit3, 
  X, 
  FileText, 
  Paperclip, 
  Upload, 
  User, 
  Phone, 
  Mail, 
  Briefcase,
  AlertOctagon,
  Download
} from "lucide-react";
import { translations } from "../utils/translations";
import { Employee, EmployeeDocument } from "../types";
import { socket } from "../socket";

interface EmployeesModuleProps {
  language: "ar" | "en";
  addLog: (ar: string, en: string, category: "ticket" | "dispatch" | "field" | "settings" | "auth" | "system") => void;
  addNotification: (text: string) => void;
}

export default function EmployeesModule({
  language,
  addLog,
  addNotification
}: EmployeesModuleProps) {
  const t = translations[language];

  // State Management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // Custom delete target state (safe inside iframe)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  
  // Add / Edit Employee modal
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form fields
  const [name, setName] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [joinDate, setJoinDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);

  // Sub-state for documents inside form
  const [showDocForm, setShowDocForm] = useState<boolean>(false);
  const [docName, setDocName] = useState<string>("");
  const [docNameEn, setDocNameEn] = useState<string>("");
  const [docNumber, setDocNumber] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [docFile, setDocFile] = useState<string | null>(null);
  const [docFileName, setDocFileName] = useState<string>("");

  // Get current system's local date context (June 2026 based on metadata)
  const getNextMonthSpan = () => {
    const referenceDate = new Date("2026-06-09T18:40:33Z"); // Reference date
    
    // July 2026
    const nextMonth = (referenceDate.getMonth() + 1) % 12; 
    const nextMonthYear = referenceDate.getMonth() === 11 ? referenceDate.getFullYear() + 1 : referenceDate.getFullYear();
    
    return { nextMonth, nextMonthYear };
  };

  const { nextMonth, nextMonthYear } = getNextMonthSpan();

  // Helper check to see if a document is expiring next month
  const isExpiringNextMonth = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return d.getMonth() === nextMonth && d.getFullYear() === nextMonthYear;
  };

  // Helper check for overall near-expiry (less than or equal to 30 days)
  const isExpiringIn30Days = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const today = new Date("2026-06-09T18:40:33Z");
    const diffTime = d.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 3600 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (e) {
      console.error("Failed to load employees:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();

    socket.on("employeesUpdated", (employeesList: Employee[]) => {
      setEmployees(employeesList);
      // Synchronize active selected employee state in case of real-time deletion or update
      setSelectedEmployee(prev => {
        if (!prev) return null;
        const exists = employeesList.find(e => e.id === prev.id);
        return exists || null;
      });
    });

    return () => {
      socket.off("employeesUpdated");
    };
  }, []);

  // Run alert scanner on employee documents whenever employees load
  useEffect(() => {
    if (employees.length === 0) return;

    const storedNotified = localStorage.getItem("itqan_notified_employees");
    let notifiedEvents: Record<string, boolean> = {};
    if (storedNotified) {
      try { notifiedEvents = JSON.parse(storedNotified); } catch { notifiedEvents = {}; }
    }

    let hasNewNotification = false;

    employees.forEach(emp => {
      emp.documents.forEach(doc => {
        const expiringNextMonth = isExpiringNextMonth(doc.expiryDate);
        if (expiringNextMonth) {
          const eventKey = `emp-doc-${emp.id}-${doc.id}-${doc.expiryDate}`;
          if (!notifiedEvents[eventKey]) {
            const msgAr = `⚠️ تنبيه منتهى الصلاحية الشهر القادم: الموظف [${emp.name}] - مستند [${doc.name}] (رقم ${doc.docNumber}) سينتهي في ${doc.expiryDate}.`;
            const msgEn = `⚠️ Document expiry next month: Employee [${emp.name}] - [${doc.nameEn || doc.name}] (No. ${doc.docNumber}) expires on ${doc.expiryDate}.`;
            addNotification(language === "ar" ? msgAr : msgEn);
            notifiedEvents[eventKey] = true;
            hasNewNotification = true;
          }
        }
      });
    });

    if (hasNewNotification) {
      localStorage.setItem("itqan_notified_employees", JSON.stringify(notifiedEvents));
    }
  }, [employees, language]);

  // Open modal for new employee
  const handleNewEmployee = () => {
    setEditingId(null);
    setName("");
    setRole("");
    setJoinDate(new Date().toISOString().split("T")[0]);
    setPhoneNumber("");
    setEmail("");
    setDocuments([]);
    setShowDocForm(false);
    setShowForm(true);
  };

  // Open modal for editing employee
  const handleEditEmployee = (emp: Employee) => {
    setEditingId(emp.id);
    setName(emp.name);
    setRole(emp.role);
    setJoinDate(emp.joinDate);
    setPhoneNumber(emp.phoneNumber || "");
    setEmail(emp.email || "");
    setDocuments(emp.documents || []);
    setShowDocForm(false);
    setShowForm(true);
  };

  // Document management inside employee form
  const handleAddDocumentToTempList = () => {
    if (!docName || !docNumber || !expiryDate) {
      alert(language === "ar" ? "يرجى تعبئة بيانات الوثيقة" : "Please complete document details");
      return;
    }

    const newDoc: EmployeeDocument = {
      id: "doc-" + Date.now().toString(),
      name: docName,
      nameEn: docNameEn || docName,
      docNumber,
      expiryDate,
      dataUrl: docFile || undefined,
      fileName: docFileName || undefined
    };

    setDocuments(prev => [...prev, newDoc]);
    
    // Clear sub-form fields
    setDocName("");
    setDocNameEn("");
    setDocNumber("");
    setExpiryDate("");
    setDocFile(null);
    setDocFileName("");
    setShowDocForm(false);
  };

  const handleRemoveDocumentFromTempList = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  // Base64 File Loader for attachments
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setDocFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Save employee
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role || !joinDate) {
      alert(language === "ar" ? "يرجى تعبئة الخانات المطلوبة" : "Please fill in required fields");
      return;
    }

    const payload = {
      name,
      role,
      joinDate,
      phoneNumber,
      email,
      documents
    };

    try {
      const isEdit = !!editingId;
      const url = isEdit ? `/api/employees/${editingId}` : "/api/employees";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedEmp = await res.json();
        
        // Audit log action
        if (isEdit) {
          addLog(
            `تحديث سجل الموظف: تم تعديل بيانات الموظف [${name}] ومستنداته المرفقة.`,
            `Modified profile and work documents of employee [${name}].`,
            "settings"
          );
        } else {
          addLog(
            `موظف جديد: تسجيل الموظف [${name}] كعضو بالشركة وانضمامه في ${joinDate}.`,
            `Onboarded new employee [${name}] into company roster on ${joinDate}.`,
            "settings"
          );
        }

        // Refresh list
        await fetchEmployees();
        setShowForm(false);
        if (selectedEmployee && selectedEmployee.id === editingId) {
          setSelectedEmployee({ ...selectedEmployee, ...savedEmp });
        }
      } else {
        alert(language === "ar" ? "حدث خطأ أثناء حفظ سجل الموظف" : "Error saving employee record");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete employee trigger
  const handleDeleteEmployee = (id: string, empName: string) => {
    setDeleteTarget({ id, name: empName });
  };

  // Safe delete executor
  const executeDeleteEmployee = async () => {
    if (!deleteTarget) return;
    const { id, name: empName } = deleteTarget;

    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        addLog(
          `تم إنهاء خدمة الموظف وحذف أوراقه: [${empName}] بنجاح من القوائم.`,
          `Terminated records and purged documents of employee [${empName}] on system.`,
          "settings"
        );
        setDeleteTarget(null);
        setSelectedEmployee(null);
      } else {
        alert(language === "ar" ? "فشل الغاء أو حذف الموظف" : "Delete failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter & Search computation
  const filteredEmployees = employees.filter(emp => {
    const q = searchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.role.toLowerCase().includes(q) ||
      (emp.phoneNumber && emp.phoneNumber.includes(q)) ||
      (emp.email && emp.email.toLowerCase().includes(q))
    );
  });

  // Collect all documents across all employees to find alerts
  const allExpiringDocs = employees.reduce((list, emp) => {
    emp.documents.forEach(doc => {
      const nextMonth = isExpiringNextMonth(doc.expiryDate);
      const days30 = isExpiringIn30Days(doc.expiryDate);
      if (nextMonth || days30) {
        list.push({
          empId: emp.id,
          empName: emp.name,
          doc,
          nextMonth,
          days30
        });
      }
    });
    return list;
  }, [] as Array<{ empId: string; empName: string; doc: EmployeeDocument; nextMonth: boolean; days30: boolean }>);

  return (
    <div className="space-y-6">
      
      {/* Upper Module header */}
      <div className="bg-white border border-[#E2E6ED] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-[#EBF3FF] text-[#1A56DB] rounded-xl flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#111827] font-cairo">
                {language === "ar" ? "الموظفين ومتابعة الأوراق الرسمية" : "Employees & Official Corporate Papers"}
              </h1>
              <p className="text-xs text-gray-500 mt-1 font-cairo font-medium">
                {language === "ar" 
                  ? "متابعة بيانات الموظفين الميدانيين والإداريين، الرخص التشغيلية، الإقامات، والتنبيه التلقائي بانتهاء المستندات."
                  : "Track workforce directory, driving/municipality licenses, resident permits, and automated document expiration warnings."}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleNewEmployee}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1A56DB] hover:bg-[#1546b3] text-white text-xs font-black rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{language === "ar" ? "توظيف وإضافة أوراق موظف جديد" : "Onboard Employee & Documents"}</span>
        </button>
      </div>

      {/* EXPIRATION EMERGENCY BANNER */}
      {allExpiringDocs.length > 0 && (
        <div className="p-5 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-3 shadow-xs animate-pulse">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertOctagon className="w-5 h-5 text-amber-700 animate-bounce" />
            <h3 className="font-extrabold text-xs font-cairo">
              {language === "ar" 
                ? "⚠️ رادارات المتابعة: وثائق توشك على الانتهاء الشهر القادم أو خلال 30 يوم!" 
                : "⚠️ Verification Radar: Corporate documents expiring next month or within 30 days!"}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allExpiringDocs.map((item, index) => (
              <div 
                key={index}
                onClick={() => {
                  const found = employees.find(e => e.id === item.empId);
                  if (found) setSelectedEmployee(found);
                }}
                className="bg-white border border-amber-200/70 hover:border-amber-400 p-3.5 rounded-xl cursor-pointer hover:shadow-2xs transition-all space-y-1"
              >
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-black font-cairo text-gray-900 border-b border-gray-100 pb-0.5">
                    👤 {item.empName}
                  </span>
                  {item.nextMonth && (
                    <span className="text-[8px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded uppercase">
                      {language === "ar" ? "الشهر القادم" : "Next Month"}
                    </span>
                  )}
                  {item.days30 && !item.nextMonth && (
                    <span className="text-[8px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded uppercase">
                      ➡️ 30 {language === "ar" ? "يوم" : "Days"}
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-gray-700">
                  📄 {language === "ar" ? item.doc.name : item.doc.nameEn || item.doc.name}
                </p>
                <p className="text-[9px] font-bold text-[#E67E22] font-mono">
                  🗓️ {language === "ar" ? "انتهاء" : "Expiry"}: {item.doc.expiryDate}
                </p>
                <p className="text-[8px] text-gray-400">
                  🔢 {language === "ar" ? "رقم الوثيقة" : "Doc No"}: {item.doc.docNumber}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Body Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Directory list - 7 spans */}
        <div className="lg:col-span-7 bg-white border border-[#E2E6ED] rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            {/* Table Header Filter */}
            <div className="p-4 border-b border-[#E2E6ED] bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xs font-black text-[#111827] font-cairo uppercase tracking-wider">
                👥 {language === "ar" ? "دليل سجلات الموظفين" : "Employee Directory Records"}
              </h2>
              
              {/* Directory search string */}
              <div className="relative w-full max-w-sm">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute top-1/2 left-3 pr-0.5 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={language === "ar" ? "ابحث باسم الموظف، المسمى الفني، الجوال..." : "Search staff directory..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${language === "ar" ? "pr-9 pl-4 text-right" : "pl-9 pr-4 text-left"} py-2 text-xs border border-[#E2E6ED] rounded-xl focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] focus:outline-hidden font-cairo bg-white`}
                />
              </div>
            </div>

            {/* List Table container */}
            <div className="overflow-x-auto min-h-[400px]">
              {loading ? (
                <div className="text-center py-20">
                  <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-[#1A56DB] animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-400 font-bold">{language === "ar" ? "جاري مزامنة القوائم من السحابة..." : "Loading records from database..."}</p>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-24 space-y-2">
                  <p className="text-xs font-bold text-gray-400">{language === "ar" ? "لا توجد نتائج مطابقة لبحثك" : "No matching staff members found"}</p>
                  <p className="text-[10px] text-gray-400">{language === "ar" ? "تأكد من كتابة أحرف البحث بصورة صحيحة." : "Check search spelling or add a new record."}</p>
                </div>
              ) : (
                <table className="w-full text-right" dir={language === "ar" ? "rtl" : "ltr"}>
                  <thead>
                    <tr className="border-b border-[#E2E6ED] bg-slate-50 text-gray-500 font-black text-[10px] uppercase font-cairo select-none">
                      <th className="py-3 px-4">{language === "ar" ? "الاسم ومعلومات الاتصال" : "Full Name / Details"}</th>
                      <th className="py-3 px-4">{language === "ar" ? "المسمى الوظيفي" : "Role / Title"}</th>
                      <th className="py-3 px-4">{language === "ar" ? "تاريخ الالتحاق" : "Join Date"}</th>
                      <th className="py-3 px-4 text-center">{language === "ar" ? "عدد الأوراق المرفقة" : "Docs Locked"}</th>
                      <th className="py-3 px-4 text-center">{language === "ar" ? "فحص الحالة" : "Direct Check"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6ED]">
                    {filteredEmployees.map((emp) => {
                      // Check if employee has warning documents
                      const hasNextMonthExpiry = emp.documents.some(d => isExpiringNextMonth(d.expiryDate));
                      const isSelected = selectedEmployee?.id === emp.id;

                      return (
                        <tr
                          key={emp.id}
                          className={`hover:bg-slate-50/50 transition-colors cursor-pointer text-xs ${
                            isSelected ? "bg-blue-50/40" : ""
                          }`}
                          onClick={() => setSelectedEmployee(emp)}
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900 font-cairo flex items-center gap-1.5">
                              <span>{emp.name}</span>
                              {hasNextMonthExpiry && (
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" title={language === "ar" ? "أوراق تنتهي الشهر القادم!" : "Expiry warning next month!"} />
                              )}
                            </div>
                            <div className="text-[9px] text-gray-400 font-mono mt-0.5">
                              {emp.phoneNumber ? `📞 ${emp.phoneNumber}` : ""} {emp.email ? `✉️ ${emp.email}` : ""}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-800 text-[10px] font-bold rounded-md">
                              {emp.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-mono font-medium">
                            {emp.joinDate}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-black text-blue-600">
                            {emp.documents?.length || 0}
                          </td>
                          <td className="py-3 px-4 text-center space-x-1 space-x-reverse">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployee(emp);
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-[9px] font-black transition-all cursor-pointer"
                            >
                              {language === "ar" ? "فحص الأوراق" : "Verify Papers"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-[#E2E6ED] text-[10px] font-medium text-gray-400">
            ✅ {language === "ar" ? `مجموع موظف الشركة المسجلين: ${employees.length}` : `Total Corporate Staff registered: ${employees.length}`}
          </div>
        </div>

        {/* Right column: Selected Employee detail card & document viewer */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card View */}
          {selectedEmployee ? (
            <div className="bg-white border border-[#E2E6ED] rounded-2xl shadow-xs overflow-hidden">
              {/* Header profile info */}
              <div className="p-5 border-b border-[#E2E6ED] bg-slate-50/60 relative">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 text-[#1A56DB] rounded-full flex items-center justify-center font-extrabold text-[#1A56DB]">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-gray-900 font-cairo">
                        {selectedEmployee.name}
                      </h3>
                      <p className="text-[11px] font-bold text-gray-500 font-cairo flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                        <span>{selectedEmployee.role}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleEditEmployee(selectedEmployee)}
                      className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title={language === "ar" ? "تعديل الموظف" : "Edit Profile"}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(selectedEmployee.id, selectedEmployee.name)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title={language === "ar" ? "حذف الموظف نهائياً" : "Purge Staff"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-[10px] font-bold border-t border-gray-100 pt-3 text-slate-500">
                  <div>
                    <span className="block text-[8px] text-gray-400 font-extrabold pb-0.5 uppercase tracking-wider">{language === "ar" ? "رقم الهاتف" : "Phone line"}</span>
                    <span className="font-mono text-gray-800">☎️ {selectedEmployee.phoneNumber || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-gray-400 font-extrabold pb-0.5 uppercase tracking-wider">{language === "ar" ? "تاريخ الالتحاق" : "Joined On"}</span>
                    <span className="font-mono text-gray-800">🗓️ {selectedEmployee.joinDate}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[8px] text-gray-400 font-extrabold pb-0.5 uppercase tracking-wider">{language === "ar" ? "البريد الإلكتروني" : "Email address"}</span>
                    <span className="font-semibold text-gray-800 lowercase truncate block">✉️ {selectedEmployee.email || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Documents grid for Selected employee */}
              <div className="p-5 space-y-4">
                <h4 className="text-[10px] font-black text-gray-700 font-cairo uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center justify-between">
                  <span>📄 {language === "ar" ? "المستندات والأوراق الموثقة المرفقة" : "Corporate Papers & Document Vault"}</span>
                  <span className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full font-mono">{selectedEmployee.documents?.length || 0}</span>
                </h4>

                {(!selectedEmployee.documents || selectedEmployee.documents.length === 0) ? (
                  <div className="text-center py-10 bg-[#FBFBFB] border border-dashed border-gray-200 rounded-xl">
                    <p className="text-[10px] text-gray-400 font-bold">{language === "ar" ? "لا توجد أوراق أو رخص مسجلة للموظف" : "No licenses or documents registered under this profile"}</p>
                    <button
                      onClick={() => handleEditEmployee(selectedEmployee)}
                      className="mt-2 text-[10px] text-[#1A56DB] font-extrabold underline cursor-pointer"
                    >
                      {language === "ar" ? "+ أضف أول مستند الآن" : "+ Onboard first license paper"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedEmployee.documents.map((doc) => {
                      const exprNextMonth = isExpiringNextMonth(doc.expiryDate);
                      const expr30Days = isExpiringIn30Days(doc.expiryDate);

                      return (
                        <div 
                          key={doc.id}
                          className={`p-3.5 border rounded-xl space-y-2 relative transition-all ${
                            exprNextMonth 
                              ? "bg-amber-50/50 border-amber-300" 
                              : expr30Days 
                                ? "bg-rose-50/30 border-rose-200" 
                                : "bg-slate-50/40 border-slate-100 hover:border-slate-300"
                          }`}
                        >
                          {/* Top row */}
                          <div className="flex justify-between items-start">
                            <span className="text-[11px] font-black text-gray-900 font-cairo">
                              📝 {language === "ar" ? doc.name : doc.nameEn || doc.name}
                            </span>
                            
                            <div className="flex items-center gap-1.5 shrink-0">
                              {exprNextMonth && (
                                <span className="text-[7.5px] bg-amber-200 text-amber-900 font-extrabold px-1.5 py-0.5 rounded uppercase">
                                  {language === "ar" ? "انتهاء الشهر المقبل" : "Expires Next Month"}
                                </span>
                              )}
                              {expr30Days && !exprNextMonth && (
                                <span className="text-[7.5px] bg-rose-150 text-rose-800 bg-rose-50 border border-rose-200 font-extrabold px-1.5 py-0.5 rounded uppercase">
                                  {language === "ar" ? "شارف على الانتهاء" : "Impending Expiry"}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 text-[9px] font-bold text-gray-500 font-mono">
                            <div>
                              <span>رقم المستند:</span> <span className="text-gray-800">{doc.docNumber || "—"}</span>
                            </div>
                            <div className="text-right">
                              <span>تاريخ الانتهاء:</span> <span className={`${exprNextMonth || expr30Days ? "text-amber-750 font-black text-[#E67E22]" : "text-gray-800"}`}>{doc.expiryDate}</span>
                            </div>
                          </div>

                          {/* Download attachment simulation */}
                          {doc.dataUrl ? (
                            <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-2 text-[9px] font-bold text-slate-500">
                              <span className="truncate max-w-[200px] text-gray-500">📎 {doc.fileName || "document_attachment.pdf"}</span>
                              <a
                                href={doc.dataUrl}
                                download={doc.fileName || "attachment"}
                                className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 rounded transition-colors"
                              >
                                <Download className="w-3 h-3" />
                                <span>{language === "ar" ? "تحميل" : "Preview"}</span>
                              </a>
                            </div>
                          ) : (
                            <div className="border-t border-dashed border-gray-100 pt-1 text-[8px] text-gray-400">
                              {language === "ar" ? "لا يوجد مرفق مصور مأخوذ بالملف" : "No attached photo photocopy filed"}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#E2E6ED] rounded-2xl p-16 text-center shadow-xs">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 mx-auto text-gray-400">
                <UserCheck className="w-8 h-8" />
              </div>
              <p className="text-xs font-black text-gray-700 font-cairo">
                {language === "ar" ? "حدد اسماً لفحص أرشيف الأوراق وتاريخ الالتحاق" : "Pick an operator to audit corporate papers & certificates"}
              </p>
              <p className="text-[10px] text-slate-400 max-w-xs mx-auto mt-2">
                {language === "ar"
                  ? "اختر موظفاً من دليل الرواد لرصد رخصة القيادة، الإقامة، وتاريخ إبرام عقده مع الشركة."
                  : "Pick a personnel card to review driver authorization, active visas, safety training cards, or corporate agreements."}
              </p>
            </div>
          )}

        </div>

      </div>

      {/* NEW & EDIT EMPLOYEE FLOATING FORM SCREEN (FORM DRAWER DIALOG) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col justify-between"
            dir={language === "ar" ? "rtl" : "ltr"}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E2E6ED] bg-slate-50 flex justify-between items-center shrink-0">
              <h3 className="font-extrabold text-sm text-gray-900 font-cairo flex items-center gap-2">
                <UserCheck className="w-4.5 h-4.5 text-[#1A56DB]" />
                <span>
                  {editingId 
                    ? (language === "ar" ? `تحيين سجل الموظف: ${name}` : `Update profile records of: ${name}`) 
                    : (language === "ar" ? "تسجيل وتأجير ملف موظف جديد" : "Onboard fresh profile in corporate register")}
                </span>
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable form body */}
            <form onSubmit={handleSaveEmployee} className="flex-1 overflow-y-auto max-h-[70vh] p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Employee Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider font-cairo block">
                    {language === "ar" ? "اسم الموظف الكلي *" : "Employee Full Name *"}
                  </label>
                  <div className="relative">
                    <User className="absolute top-3 left-3 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      required
                      placeholder={language === "ar" ? "مثال: م. أحمد منصور" : "e.g., Eng. Ahmed Mansour"}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#FBFBFB] border border-[#E2E6ED] rounded-xl focus:border-[#1A56DB] focus:outline-hidden font-cairo"
                    />
                  </div>
                </div>

                {/* Role / Job Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider font-cairo block">
                    {language === "ar" ? "المسمى الوظيفي والدور الكلي *" : "Role / Job Title *"}
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute top-3 left-3 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      required
                      placeholder={language === "ar" ? "مثال: فني صيانة طاقة شمسية" : "e.g., Solar Maintenance Specialist"}
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#FBFBFB] border border-[#E2E6ED] rounded-xl focus:border-[#1A56DB] focus:outline-hidden font-cairo"
                    />
                  </div>
                </div>

                {/* Date of Joining */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider font-cairo block">
                    {language === "ar" ? "تاريخ الالتحاق بالشركة *" : "Date of Joining *"}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute top-3 left-3 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      required
                      value={joinDate}
                      onChange={(e) => setJoinDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs font-mono bg-[#FBFBFB] border border-[#E2E6ED] rounded-xl focus:border-[#1A56DB] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Phone Line */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider font-cairo block">
                    {language === "ar" ? "رقم جوال الموظف المباشر" : "Direct Phone Line"}
                  </label>
                  <div className="relative">
                    <Phone className="absolute top-3 left-3 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="e.g., 0501234567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs font-mono bg-[#FBFBFB] border border-[#E2E6ED] rounded-xl focus:border-[#1A56DB] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Email address */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider font-cairo block">
                    {language === "ar" ? "عنوان البريد الإلكتروني" : "Personnel Email Address"}
                  </label>
                  <div className="relative">
                    <Mail className="absolute top-3 left-3 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      placeholder="e.g., staff.name@itqan.co"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs lowercase font-semibold bg-[#FBFBFB] border border-[#E2E6ED] rounded-xl focus:border-[#1A56DB] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* DOCUMENTS SUB-SECTION INSIDE MODAL FORM */}
              <div className="border-t border-[#E2E6ED] pt-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[11px] font-black text-gray-800 font-cairo uppercase tracking-wider">
                    📂 {language === "ar" ? "الملفات وقائمة الأوراق المرفقة بالملف" : "Filed Attachments & Identification Papers"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowDocForm(!showDocForm)}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-150 text-[#1A56DB] text-[10px] font-black rounded-lg transition-all flex items-center gap-1.5"
                  >
                    {showDocForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{showDocForm ? (language === "ar" ? "إلغاء الإضافة" : "Cancel Add") : (language === "ar" ? "+ أضف ورقة جديدة" : "+ Onboard License / ID")}</span>
                  </button>
                </div>

                {/* IN-FORM DOC ADD SUB-FORM */}
                {showDocForm && (
                  <div className="p-4 bg-blue-50/40 border border-blue-200/50 rounded-2xl space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* Doc name in Arabic */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 font-cairo block">{language === "ar" ? "نوع / اسم الوثيقة بالعربية *" : "Document Type in Arabic *"}</label>
                        <select
                          value={docName}
                          onChange={(e) => {
                            setDocName(e.target.value);
                            // Auto map English translations for consistency
                            const mapping: Record<string, string> = {
                              "الإقامة / الهوية الوطنية": "Residence ID / National ID",
                              "رخصة القيادة": "Driver's License",
                              "رخصة العمل البلدية": "Municipality Work License",
                              "جواز سفر": "Passport",
                              "شهادة صحية": "Health Certification",
                              "شهادة سلامة ميدانية": "Field Safety Certification"
                            };
                            if (mapping[e.target.value]) {
                              setDocNameEn(mapping[e.target.value]);
                            }
                          }}
                          className="w-full text-xs py-2 bg-white border border-[#E2E6ED] rounded-xl font-cairo"
                        >
                          <option value="">{language === "ar" ? "== اختر نوع الوثيقة ==" : "== Select Document Type =="}</option>
                          <option value="الإقامة / الهوية الوطنية">الإقامة / الهوية الوطنية</option>
                          <option value="رخصة القيادة">رخصة القيادة</option>
                          <option value="رخصة العمل البلدية">رخصة العمل البلدية</option>
                          <option value="جواز سفر">جواز سفر</option>
                          <option value="شهادة صحية">شهادة صحية</option>
                          <option value="شهادة سلامة ميدانية">شهادة سلامة ميدانية</option>
                          <option value="أخرى">أخرى (مخصصة)</option>
                        </select>
                        
                        {docName === "أخرى" && (
                          <input
                            type="text"
                            placeholder="اكتب اسم الوثيقة المخصصة"
                            onChange={(e) => setDocName(e.target.value)}
                            className="w-full text-xs mt-1.5 p-2 bg-white border border-[#E2E6ED] rounded-lg font-cairo"
                          />
                        )}
                      </div>

                      {/* Doc name in English */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 block">Document Name (English) *</label>
                        <input
                          type="text"
                          placeholder="e.g., Driving License"
                          value={docNameEn}
                          onChange={(e) => setDocNameEn(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white border border-[#E2E6ED] rounded-xl"
                        />
                      </div>

                      {/* Number */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 font-cairo block">{language === "ar" ? "رقم الوثيقة / الرخصة الرقمية *" : "Document / License Number *"}</label>
                        <input
                          type="text"
                          placeholder="e.g., 2441092837"
                          value={docNumber}
                          onChange={(e) => setDocNumber(e.target.value)}
                          className="w-full text-xs font-mono px-3 py-2 bg-white border border-[#E2E6ED] rounded-xl"
                        />
                      </div>

                      {/* Expiry Date */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 font-cairo block">{language === "ar" ? "تاريخ انتهاء الصلاحية الرسمية *" : "Official Expiry Date *"}</label>
                        <input
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          className="w-full text-xs font-mono px-3 py-2 bg-white border border-[#E2E6ED] rounded-xl"
                        />
                      </div>

                      {/* Attached PDF/Image photocopy */}
                      <div className="col-span-1 md:col-span-2 space-y-1">
                        <label className="text-[9px] font-black text-gray-500 font-cairo block">{language === "ar" ? "رفع صورة أو نسخة الوثيقة" : "Onboard Attached Photocopy"}</label>
                        <div className="border border-dashed border-[#E2E6ED] bg-white rounded-xl p-3 text-center relative hover:border-[#1A56DB] transition-all">
                          <input
                            type="file"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 font-semibold font-cairo">
                            <Upload className="w-4 h-4 text-gray-400" />
                            <span>{docFileName ? docFileName : (language === "ar" ? "اضغط لرفع ورقة العمل (PDF / صورة)" : "Click to select work document (PDF / Image)")}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddDocumentToTempList}
                      className="w-full py-2 bg-[#1A56DB] text-white text-[10px] font-black rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{language === "ar" ? "إدراج الوثيقة باللائحة" : "Insert Paper to list"}</span>
                    </button>
                  </div>
                )}

                {/* TEMP DOCS LISTING */}
                <div className="space-y-2">
                  {documents.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50/55 rounded-xl border border-dashed border-gray-100 text-[10px] text-gray-400">
                      {language === "ar" ? "لا توجد أوراق أو مستندات مدرجة بعد." : "No identity papers filed yet."}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 bg-slate-50/50 border border-slate-100 rounded-xl">
                      {documents.map((doc, idx) => (
                        <div key={doc.id || idx} className="p-3 flex justify-between items-center text-xs">
                          <div className="space-y-0.5">
                            <p className="font-extrabold text-[#111827] font-cairo">
                              📄 {language === "ar" ? doc.name : doc.nameEn}
                            </p>
                            <p className="text-[9px] text-gray-400 font-mono">
                              Num: <span className="font-bold">{doc.docNumber}</span> | Exp: <span className="font-bold text-[#E67E22]">{doc.expiryDate}</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocumentFromTempList(doc.id)}
                            className="p-1 px-2 hover:bg-rose-100 text-rose-600 hover:text-rose-800 rounded transition-colors text-[9px] font-extrabold"
                          >
                            × {language === "ar" ? "إزالة" : "Remove"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit panel */}
              <div className="border-t border-[#E2E6ED] pt-5 flex justify-end gap-3.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-[#E2E6ED] rounded-xl text-gray-500 hover:text-gray-900 bg-white text-xs font-bold transition-all cursor-pointer"
                >
                  {language === "ar" ? "إلغاء التعديل" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1A56DB] hover:bg-[#1546b3] text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  {language === "ar" ? "حفظ وتوثيق كافة التعديلات" : "Commit & Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Native UI for safety inside Iframe) */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-cairo">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden border border-[#E2E6ED] shadow-xl p-6 space-y-4" dir={language === "ar" ? "rtl" : "ltr"}>
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-gray-900">
                {language === "ar" ? "تأكيد حذف سجل الموظف؟" : "Confirm Employee Deletion?"}
              </h3>
            </div>
            
            <p className="text-xs text-gray-500 leading-relaxed font-semibold">
              {language === "ar" 
                ? `هل أنت متأكد من حذف وإلغاء الموظف [${deleteTarget.name}] وجميع مستنداته وأوراقه الرسمية نهائياً من السجلات؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to permanently delete and wipe the records of employee [${deleteTarget.name}] and all official papers? This action cannot be reversed.`}
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                {language === "ar" ? "تراجع وإلغاء" : "Cancel"}
              </button>
              <button
                onClick={executeDeleteEmployee}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                {language === "ar" ? "نعم، حذف نهائي" : "Yes, Purge Record"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
