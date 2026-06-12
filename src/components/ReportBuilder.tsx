import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { 
  FileText,
  Printer, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  Award, 
  Check, 
  FileImage, 
  Table, 
  Heading, 
  Info, 
  Save, 
  FolderOpen,
  Settings as SettingsIcon,
  Columns,
  Square,
  Type,
  Layout,
  RefreshCw,
  Edit3,
  X,
  Upload,
  Layers,
  FileSpreadsheet
} from "lucide-react";
import { SystemSettings } from "../types";

interface ReportBuilderProps {
  language: "ar" | "en";
  settings: SystemSettings;
}

// Overlap-proof, structured sections
export type SectionType = "header" | "summary" | "metrics" | "table" | "photos" | "signatures" | "divider";

export interface ReportSection {
  id: string;
  type: SectionType;
  titleAr: string;
  titleEn: string;
  styles: {
    paddingY: "small" | "medium" | "large";
    backgroundColor: string;
    showTitle: boolean;
  };
  // Specific properties for varied types
  data: {
    // text/summary
    textAr?: string;
    textEn?: string;
    fontSize?: "sm" | "base" | "lg" | "xl";
    textAlign?: "right" | "left" | "center";
    
    // metrics
    elements?: Array<{
      id: string;
      labelAr: string;
      labelEn: string;
      valueAr: string;
      valueEn: string;
      color: string;
    }>;
    
    // table
    headersAr?: string[];
    headersEn?: string[];
    rows?: string[][]; // grid of rows & columns
    tableTheme?: "blue" | "emerald" | "slate" | "amber";
    
    // photos
    files?: Array<{
      url: string;
      captionAr: string;
      captionEn: string;
    }>;
    
    // signatures
    partyOneTitleAr?: string;
    partyOneTitleEn?: string;
    partyTwoTitleAr?: string;
    partyTwoTitleEn?: string;
    showSeal?: boolean;
    sealTextAr?: string;
    sealTextEn?: string;
  };
}

interface SavedReport {
  id: string;
  name: string;
  timestamp: string;
  themeColor: string;
  borderColor: string;
  borderStyle: "none" | "simple" | "royal" | "tech";
  watermark: string;
  sections: ReportSection[];
}

export default function ReportBuilder({ language, settings }: ReportBuilderProps) {
  // Global document configuration states
  const [themeColor, setThemeColor] = useState<string>("#1d4ed8"); // default corporate blue
  const [borderColor, setBorderColor] = useState<string>("#1e3a8a");
  const [borderStyle, setBorderStyle] = useState<"none" | "simple" | "royal" | "tech">("simple");
  const [watermark, setWatermark] = useState<string>("");
  const [reportName, setReportName] = useState<string>("");
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"design" | "editor">("design");
  const [zoomScale, setZoomScale] = useState<number>(0.8); // Scale A4 to fit smaller viewports by default

  // Default professional sections
  const [sections, setSections] = useState<ReportSection[]>([
    {
      id: "sec_header",
      type: "header",
      titleAr: "ترويسة التقرير الرسمية",
      titleEn: "Official Report Header",
      styles: { paddingY: "medium", backgroundColor: "transparent", showTitle: false },
      data: {
        textAr: "تقرير الجودة والمعايرة الفنية وتدقيق أعمال الصيانة الميدانية الشاملة",
        textEn: "Comprehensive SLA Alignment, Quality Calibration & Field Maintenance Ledger",
      }
    },
    {
      id: "sec_summary",
      type: "summary",
      titleAr: "الخلاصة التنفيذية والتقييم الفني",
      titleEn: "Executive Summary & Engineering Overview",
      styles: { paddingY: "medium", backgroundColor: "transparent", showTitle: true },
      data: {
        textAr: "بناءً على التكليف الميداني المعتمد، تم فحص ومعايرة وتركيب الأنظمة الفنية والتأكد من توافقها مع شروط جودة التشغيل والسلامة بنسبة أمان فنية بلغت 100%.",
        textEn: "Following the field maintenance directive, all systems have been inspected, calibrated, and certified. The operation fully meets the technical standards with zero discrepancies identified.",
        fontSize: "base",
        textAlign: language === "ar" ? "right" : "left"
      }
    },
    {
      id: "sec_metrics",
      type: "metrics",
      titleAr: "مؤشرات الأداء والكفاءة التشغيلية",
      titleEn: "Operational SLA Metrics",
      styles: { paddingY: "small", backgroundColor: "transparent", showTitle: true },
      data: {
        elements: [
          { id: "m1", labelAr: "مستوى مطابقة المعايير", labelEn: "SLA Match Level", valueAr: "99.8%", valueEn: "99.8%", color: "#10b981" },
          { id: "m2", labelAr: "زمن الاستجابة الفعلي", labelEn: "Response Duration", valueAr: "35 دقيقة", valueEn: "35 Mins", color: "#3b82f6" },
          { id: "m3", labelAr: "تقييم الجودة الكلي", labelEn: "Safety Rating", valueAr: "ممتاز (A+)", valueEn: "Excellent (A+)", color: "#8b5cf6" },
        ]
      }
    },
    {
      id: "sec_table",
      type: "table",
      titleAr: "بيان بنود الصيانة الدورية المنجزة",
      titleEn: "Preventive & Corrective Maintenance Schedule",
      styles: { paddingY: "medium", backgroundColor: "transparent", showTitle: true },
      data: {
        tableTheme: "blue",
        headersAr: ["رقم البند", "مهمة الفحص والتدقيق", "الحالة الفنية للأنظمة"],
        headersEn: ["Block Ref", "Inspected Core System Component", "SLA Status"],
        rows: [
          ["01", "فحص الدوائر الكهربائية والتحكم التلقائي", "مطابق وممتاز / Approved"],
          ["02", "معايرة الحساسات وقراءة الضغوط الهيدروليكية", "مطابق للكتالوج / Pass"],
          ["03", "تنظيف الفلاتر الرئيسية وضبط دورة التبريد", "تم الاستبدال / Restored"]
        ]
      }
    },
    {
      id: "sec_signatures",
      type: "signatures",
      titleAr: "الاعتماد القانوني للملحق الفني",
      titleEn: "Operational Authorization & Seals",
      styles: { paddingY: "medium", backgroundColor: "transparent", showTitle: false },
      data: {
        partyOneTitleAr: "اعتماد الطرف الأول (مقدم الخدمة)",
        partyOneTitleEn: "Authorized Provider Seal",
        partyTwoTitleAr: "اعتماد الطرف الثاني (العميل)",
        partyTwoTitleEn: "Authorized Customer Seal",
        showSeal: true,
        sealTextAr: "إتقان - معتمد",
        sealTextEn: "ITQAN VERIFIED"
      }
    }
  ]);

  // Load saved layouts
  useEffect(() => {
    try {
      const stored = localStorage.getItem("itqan_modular_reports");
      if (stored) {
        setSavedReports(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Set the title of the page properly
  const getDocTitle = () => {
    return language === "ar" ? "منشئ التقارير المخصصة والـ SLA" : "Custom Quality Report Builder";
  };

  // Reordering handler
  const moveSection = (direction: "up" | "down", index: number) => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === sections.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setSections(updated);
  };

  // Delete Section
  const deleteSection = (id: string) => {
    setSections(sections.filter(sec => sec.id !== id));
    if (activeSectionId === id) setActiveSectionId(null);
  };

  // Add Section
  const addNewSection = (type: SectionType) => {
    const id = "sec_" + new Date().getTime();
    let newSec: ReportSection;

    switch (type) {
      case "header":
        newSec = {
          id,
          type,
          titleAr: "ترويسة مخصصة جديدة",
          titleEn: "Custom Brand Header Banner",
          styles: { paddingY: "medium", backgroundColor: "transparent", showTitle: false },
          data: {
            textAr: "اكتب هنا تفاصيل الوصف المخصص لترويسة التقرير الميداني الحالية...",
            textEn: "Provide custom specifications or secondary official report ledger subtitle here..."
          }
        };
        break;
      case "divider":
        newSec = {
          id,
          type,
          titleAr: "خط فاصل",
          titleEn: "Decorative Divider Line",
          styles: { paddingY: "small", backgroundColor: "transparent", showTitle: false },
          data: {}
        };
        break;
      case "summary":
        newSec = {
          id,
          type,
          titleAr: "نص مخصص جديد",
          titleEn: "Custom Descriptive Section",
          styles: { paddingY: "medium", backgroundColor: "transparent", showTitle: true },
          data: {
            textAr: "اكتب هنا تفاصيل الفحص الدورية أو الأرقام والملاحظات الميدانية بدقة...",
            textEn: "Provide detailed inspection logs, operational remarks or maintenance notes here...",
            fontSize: "base",
            textAlign: language === "ar" ? "right" : "left"
          }
        };
        break;
      case "metrics":
        newSec = {
          id,
          type,
          titleAr: "بيانات مرقمة ومؤشرات قياس",
          titleEn: "Statistical Performance Indicators",
          styles: { paddingY: "small", backgroundColor: "transparent", showTitle: true },
          data: {
            elements: [
              { id: "e1", labelAr: "المؤشر الأول", labelEn: "First KPI", valueAr: "100%", valueEn: "100%", color: "#2563eb" },
              { id: "e2", labelAr: "المؤشر الثاني", labelEn: "Second KPI", valueAr: "آمن فنائياً", valueEn: "SLA Safe", color: "#059669" }
            ]
          }
        };
        break;
      case "table":
        newSec = {
          id,
          type,
          titleAr: "جدول فني إضافي",
          titleEn: "Operational Log Table",
          styles: { paddingY: "medium", backgroundColor: "transparent", showTitle: true },
          data: {
            tableTheme: "slate",
            headersAr: ["البند", "الوصف الميداني", "التقييم"],
            headersEn: ["Item", "Field Description", "Audit"],
            rows: [
              ["1", "تدقيق مستويات زيت المحرك والسيور", "ممتاز / Checked"],
              ["2", "اختبار التوجيه الحراري التلقائي", "مطابق / Pass"]
            ]
          }
        };
        break;
      case "photos":
        newSec = {
          id,
          type,
          titleAr: "المعرض الفني والصور قبل وبعد الصيانة",
          titleEn: "Before & After Quality Photos Grid",
          styles: { paddingY: "medium", backgroundColor: "transparent", showTitle: true },
          data: {
            files: [
              { url: "", captionAr: "صورة توضيحية أولية", captionEn: "Initial Stage Component Shot" },
              { url: "", captionAr: "صورة توضيحية ثانوية", captionEn: "Secondary Verification Shot" }
            ]
          }
        };
        break;
      case "signatures":
        newSec = {
          id,
          type,
          titleAr: "الاعتمادات ومربعات التوقيع الفني",
          titleEn: "Official Verification Signatures",
          styles: { paddingY: "medium", backgroundColor: "transparent", showTitle: false },
          data: {
            partyOneTitleAr: "الطرف الأول: قسم المتابعة الرقمية",
            partyOneTitleEn: "First Party: SLA Authority Office",
            partyTwoTitleAr: "الطرف الثاني: استلام العميل المكلف",
            partyTwoTitleEn: "Second Party: Customer Endorsement",
            showSeal: true,
            sealTextAr: "إتقان - معتمد",
            sealTextEn: "ITQAN VERIFIED"
          }
        };
        break;
      default:
        return;
    }

    setSections([...sections, newSec]);
    setActiveSectionId(id);
    setSidebarTab("editor");
  };

  // Modify Section Data helper
  const updateSectionData = (sectionId: string, fields: any) => {
    setSections(sections.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          data: { ...sec.data, ...fields }
        };
      }
      return sec;
    }));
  };

  // Modify Section Core details
  const updateSectionMeta = (sectionId: string, fields: Partial<ReportSection>) => {
    setSections(sections.map(sec => {
      if (sec.id === sectionId) {
        return { ...sec, ...fields };
      }
      return sec;
    }));
  };

  // Save Report Draft to LocalStorage
  const handleSaveReport = () => {
    const name = reportName.trim() || (language === "ar" ? `تقرير مخصص متميز ${new Date().toLocaleDateString("ar-EG")}` : `Corporate Custom Report ${new Date().toLocaleDateString()}`);
    const draft: SavedReport = {
      id: "report_" + new Date().getTime(),
      name,
      timestamp: new Date().toLocaleDateString(language === "ar" ? "ar-EG" : "en-US") + " " + new Date().toLocaleTimeString(),
      themeColor,
      borderColor,
      borderStyle,
      watermark,
      sections
    };

    const updated = [draft, ...savedReports];
    setSavedReports(updated);
    localStorage.setItem("itqan_modular_reports", JSON.stringify(updated));
    setReportName("");
    alert(language === "ar" ? "تم حفظ مسودة التقرير بنجاح في القوالب المحلية جاهزاً للطباعة مستقبلاً" : "Custom report framework saved successfully as standard local draft");
  };

  // Load Saved Report Draft
  const handleLoadReport = (draft: SavedReport) => {
    if (window.confirm(language === "ar" ? "سيتم مسح العمل الحالي وتحميل المسودة المحفوظة. هل توافق؟" : "Erase current layout to load chosen template?")) {
      setSections(draft.sections);
      setThemeColor(draft.themeColor || "#1d4ed8");
      setBorderColor(draft.borderColor || "#1e3a8a");
      setBorderStyle(draft.borderStyle || "simple");
      setWatermark(draft.watermark || "");
      setActiveSectionId(null);
      setSidebarTab("design");
    }
  };

  // Delete Saved Draft
  const handleDeleteDraft = (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedReports.filter(d => d.id !== draftId);
    setSavedReports(updated);
    localStorage.setItem("itqan_modular_reports", JSON.stringify(updated));
  };

  // Printing Core Ref integration
  const printAreaRef = useRef<HTMLDivElement>(null);
  const handleTriggerPrint = useReactToPrint({
    contentRef: printAreaRef,
    pageStyle: `@media print { 
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background-color: white !important; } 
      .no-print { display: none !important; }
      .print-border-deco { border-color: ${borderColor} !important; }
    } @page { size: A4 portrait; margin: 15mm 12mm 15mm 12mm; }`
  });

  const handlePrint = () => {
    setActiveSectionId(null); // Deselect preview markers to avoid printing editor tools
    setTimeout(() => {
      handleTriggerPrint();
    }, 120);
  };

  // Handle Photo upload base64 inside sandbox safely
  const handlePhotoUpload = (sectionId: string, photoIndex: number, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const targetSec = sections.find(s => s.id === sectionId);
      if (targetSec && targetSec.data.files) {
        const updatedFiles = [...targetSec.data.files];
        updatedFiles[photoIndex] = { ...updatedFiles[photoIndex], url };
        updateSectionData(sectionId, { files: updatedFiles });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-full flex bg-slate-100 font-sans text-slate-800 antialiased overflow-hidden select-none">
      
      {/* 1. Unified Master Control Sidebar (Left) */}
      <div className="w-80 md:w-96 bg-white border-r border-slate-200 shadow-2xl flex flex-col shrink-0 no-print z-25 select-none overflow-hidden">
        
        {/* Sidebar Header Branding */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
            <div>
              <h2 className="text-sm font-black tracking-wide leading-tight">
                {language === "ar" ? "منشئ التقارير المعتمدة" : "Premium Report Engineer"}
              </h2>
              <p className="text-[10px] text-slate-400 font-medium animate-none">
                {language === "ar" ? "تصميم ذكي بلا تداخل ومظهر احترافي" : "Strict grid-aligned modular reports"}
              </p>
            </div>
          </div>
          <Printer className="w-4 h-4 text-slate-350" />
        </div>

        {/* Dynamic Sidebar Flow Tabs */}
        <div className="flex border-b border-slate-200 shrink-0 bg-slate-50">
          <button
            type="button"
            onClick={() => setSidebarTab("design")}
            className={`flex-1 py-3 text-xs font-black text-center border-b-2 transition-all cursor-pointer ${
              sidebarTab === "design" 
                ? "border-blue-600 text-blue-600 bg-white" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {language === "ar" ? "❶ تصميم وهيكل الصفحة" : "❶ Document Styles"}
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab("editor")}
            className={`flex-1 py-3 text-xs font-black text-center border-b-2 transition-all cursor-pointer ${
              sidebarTab === "editor" 
                ? "border-blue-600 text-blue-600 bg-white" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {language === "ar" ? "❷ تعديل محتوى البند" : "❷ Edit Selected Block"}
          </button>
        </div>

        {/* Dynamic Sidebar Panels Switcher */}
        {sidebarTab === "design" ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar flex flex-col justify-between">
            
            {/* Subsection 1: Global Aesthetic Guidelines */}
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 border-b pb-1">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-black text-slate-800">
                  {language === "ar" ? "مظهر وتصميم التقرير" : "Document Color & Theme"}
                </h3>
              </div>

              {/* Theme Color layout picker */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 block">
                  {language === "ar" ? "اللون الرئيسي المعتمد للهوية:" : "Corporate Brand Theme Color:"}
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={themeColor} 
                    onChange={(e) => {
                      setThemeColor(e.target.value);
                      setBorderColor(e.target.value);
                    }}
                    className="w-10 h-8 rounded-lg cursor-pointer border border-slate-300 bg-transparent shrink-0"
                  />
                  <div className="flex gap-1 flex-1 overflow-x-auto py-0.5 custom-scrollbar">
                    {["#1d4ed8", "#10b981", "#7c3aed", "#cb0c9f", "#dc2626", "#0f172a"].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setThemeColor(color);
                          setBorderColor(color);
                        }}
                        className="w-5 h-5 rounded-full shrink-0 border border-slate-300 transition-transform active:scale-90"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Border style of page paper decoration */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  {language === "ar" ? "شكل إطار صفحات التقرير:" : "Page Border Design Layout:"}
                </label>
                <select 
                  value={borderStyle}
                  onChange={(e: any) => setBorderStyle(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs"
                >
                  <option value="none">{language === "ar" ? "بدون إطار خارجي" : "Clean Margin (No Border)"}</option>
                  <option value="simple">{language === "ar" ? "خط رفيع بسيط وراقي" : "Minimal Modern Line"}</option>
                  <option value="royal">{language === "ar" ? "إطار مزدوج كلاسيكي" : "Traditional Double (Royal)"}</option>
                  <option value="tech">{language === "ar" ? "مخطط تقني زوايا هندسية" : "Dashed Structural (Tech)"}</option>
                </select>
              </div>

              {/* Background watermark text layer */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  {language === "ar" ? "النص المائي بالخلفية (اختياري):" : "Diagonal Watermark Text (Optional):"}
                </label>
                <input 
                  type="text"
                  placeholder={language === "ar" ? "مثال: مغير السريّة، مسودة تشغيل" : "e.g. STRICTLY SECRET, DRAFT"}
                  value={watermark}
                  onChange={(e) => setWatermark(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Subsection 2: Modular block injections */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 border-b pb-1">
                <Plus className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-black text-slate-800">
                  {language === "ar" ? "إدراج وتكوين الأقسام التفاعلية" : "Insert Report Layout Blocks"}
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 font-bold leading-normal">
                {language === "ar" ? "انقر على أي جزء لإدراجه بأسفل القالب الفني وإكمال محتوى التقرير:" : "Build your ledger custom structure organically by injecting blocks:"}
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => addNewSection("header")}
                  className="flex items-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-blue-700 rounded-xl transition-all border border-slate-100 text-[11px] font-black justify-center cursor-pointer"
                >
                  <Layout className="w-3.5 h-3.5 text-cyan-500" />
                  <span>{language === "ar" ? "ترويسة التقرير" : "Report Header"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => addNewSection("summary")}
                  className="flex items-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-blue-700 rounded-xl transition-all border border-slate-100 text-[11px] font-black justify-center cursor-pointer"
                >
                  <Type className="w-3.5 h-3.5 text-blue-500" />
                  <span>{language === "ar" ? "إضافة فقرة نصية" : "Rich Text"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => addNewSection("metrics")}
                  className="flex items-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-blue-700 rounded-xl transition-all border border-slate-100 text-[11px] font-black justify-center cursor-pointer"
                >
                  <Columns className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{language === "ar" ? "مؤشرات قياس" : "Key Cards"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => addNewSection("table")}
                  className="flex items-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-blue-700 rounded-xl transition-all border border-slate-100 text-[11px] font-black justify-center cursor-pointer"
                >
                  <Table className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{language === "ar" ? "جدول أعمال" : "Table Form"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => addNewSection("photos")}
                  className="flex items-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-blue-700 rounded-xl transition-all border border-slate-100 text-[11px] font-black justify-center cursor-pointer"
                >
                  <FileImage className="w-3.5 h-3.5 text-amber-500" />
                  <span>{language === "ar" ? "معرض صور" : "Photos Grid"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => addNewSection("divider")}
                  className="flex items-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-blue-700 rounded-xl transition-all border border-slate-100 text-[11px] font-black justify-center cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 text-purple-500" />
                  <span>{language === "ar" ? "خط فاصل" : "Divider Line"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => addNewSection("signatures")}
                  className="flex items-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-blue-700 rounded-xl transition-all border border-slate-100 text-[11px] font-black justify-center cursor-pointer col-span-2"
                >
                  <Award className="w-3.5 h-3.5 text-red-500" />
                  <span>{language === "ar" ? "مربع التواقيع والختم الإداري" : "Signatures & Stamp"}</span>
                </button>
              </div>
            </div>

            {/* Subsection 3: Layout Local Archival system */}
            <div className="pt-4 border-t border-slate-150 space-y-3 flex-1 flex flex-col justify-end">
              <div className="flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-cyan-600" />
                <h3 className="text-xs font-black text-slate-800">
                  {language === "ar" ? "حفظ القالب واسترجاع المسودات" : "Draft Templates Archiving"}
                </h3>
              </div>

              <div className="flex gap-1.5">
                <input 
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder={language === "ar" ? "اسم القالب مثلاً: تقرير تكييف السبت..." : "Blueprint layout name..."}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500 placeholder:text-slate-350"
                />
                <button
                  type="button"
                  onClick={handleSaveReport}
                  className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                  title={language === "ar" ? "حفظ القالب" : "Save report draft"}
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>

              {/* Saved blueprints feed */}
              {savedReports.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pt-2 border-t border-slate-100">
                  {savedReports.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => handleLoadReport(item)}
                      className="p-2 border border-slate-100 bg-white rounded-lg text-[11px] font-bold text-slate-600 flex items-center justify-between cursor-pointer hover:bg-blue-50/60 transition-colors"
                    >
                      <span className="truncate pr-1">📁 {item.name}</span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteDraft(item.id, e)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-md animate-none"
                        title={language === "ar" ? "حذف" : "Delete"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar">
            {/* Subsection 4: Active Segment Properties Editor inside Tab 2 */}
            {activeSectionId ? (
              (() => {
                const activeSec = sections.find(s => s.id === activeSectionId);
                if (!activeSec) return null;

                return (
                  <div className="space-y-4 animate-in fade-in duration-100 text-slate-700">
                    
                    <div className="flex items-center justify-between bg-white border border-slate-200/60 p-2.5 rounded-xl">
                      <span className="text-[11px] font-black p-1 rounded-md bg-blue-50 text-blue-700 px-2 uppercase">
                        {activeSec.type}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSectionId(null);
                          setSidebarTab("design");
                        }}
                        className="text-xs text-slate-400 hover:text-slate-800 underline font-bold"
                      >
                        {language === "ar" ? "إنهاء التحديد" : "Cancel Focus"}
                      </button>
                    </div>

                    {/* Common Styles Config */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200/65 space-y-2.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">
                        {language === "ar" ? "عناوين وهوامش البند:" : "Block Title Options:"}
                      </span>
                      
                      <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                        <input 
                          type="checkbox" 
                          checked={activeSec.styles.showTitle}
                          onChange={(e) => updateSectionMeta(activeSec.id, { styles: { ...activeSec.styles, showTitle: e.target.checked } })}
                          className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          {language === "ar" ? "عرض عنوان البند بالتقرير" : "Show block title label"}
                        </span>
                      </label>

                      {activeSec.styles.showTitle && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div>
                            <label className="text-[9px] font-black text-slate-550 block mb-1">{language === "ar" ? "العنوان بالعربية:" : "Title (Arabic):"}</label>
                            <input 
                              type="text"
                              value={activeSec.titleAr}
                              onChange={(e) => updateSectionMeta(activeSec.id, { titleAr: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-550 block mb-1">{language === "ar" ? "العنوان بالإنجليزية:" : "Title (English):"}</label>
                            <input 
                              type="text"
                              value={activeSec.titleEn}
                              onChange={(e) => updateSectionMeta(activeSec.id, { titleEn: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Header specific data config */}
                    {activeSec.type === "header" && (
                      <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-200/65">
                        <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">{language === "ar" ? "محتوى الترويسة الرئيسية:" : "Header Text:"}</span>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">{language === "ar" ? "العنوان الفرعي (عربي):" : "Sub-description (AR):"}</label>
                          <textarea
                            rows={2}
                            value={activeSec.data.textAr || ""}
                            onChange={(e) => updateSectionData(activeSec.id, { textAr: e.target.value })}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">{language === "ar" ? "العنوان الفرعي (إنجليزي):" : "Sub-description (EN):"}</label>
                          <textarea
                            rows={2}
                            value={activeSec.data.textEn || ""}
                            onChange={(e) => updateSectionData(activeSec.id, { textEn: e.target.value })}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* Summary text specific dynamic editor */}
                    {activeSec.type === "summary" && (
                      <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-200/65">
                        <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">{language === "ar" ? "تنسيق وحجم النص الحكيم:" : "Summary Typography:"}</span>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[9px] font-black text-slate-500 block mb-1">{language === "ar" ? "حجم الخط:" : "Font Size:"}</label>
                            <select 
                              value={activeSec.data.fontSize || "base"}
                              onChange={(e) => updateSectionData(activeSec.id, { fontSize: e.target.value })}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                            >
                              <option value="sm">{language === "ar" ? "صغير" : "Small"}</option>
                              <option value="base">{language === "ar" ? "متوافق" : "Standard"}</option>
                              <option value="lg">{language === "ar" ? "عريض ومقروء" : "Large"}</option>
                              <option value="xl">{language === "ar" ? "ضخم" : "Hero Text"}</option>
                            </select>
                          </div>

                          <div className="flex-1">
                            <label className="text-[9px] font-black text-slate-500 block mb-1">{language === "ar" ? "المحاذاة:" : "Align:"}</label>
                            <select 
                              value={activeSec.data.textAlign || (language === "ar" ? "right" : "left")}
                              onChange={(e) => updateSectionData(activeSec.id, { textAlign: e.target.value })}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                            >
                              <option value="right">{language === "ar" ? "يمين" : "Align Right"}</option>
                              <option value="left">{language === "ar" ? "يسار" : "Align Left"}</option>
                              <option value="center">{language === "ar" ? "توسيط" : "Center"}</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">{language === "ar" ? "محتوى النص (بالعربي):" : "Arabic Text content:"}</label>
                          <textarea
                            rows={4}
                            value={activeSec.data.textAr || ""}
                            onChange={(e) => updateSectionData(activeSec.id, { textAr: e.target.value })}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">{language === "ar" ? "محتوى النص (بالإنجليزي):" : "English Text content:"}</label>
                          <textarea
                            rows={4}
                            value={activeSec.data.textEn || ""}
                            onChange={(e) => updateSectionData(activeSec.id, { textEn: e.target.value })}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* Metrics stats customized editor */}
                    {activeSec.type === "metrics" && (
                      <div className="space-y-4 bg-white p-3 rounded-xl border border-slate-200/65">
                        <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                          {language === "ar" ? "بيانات وعناوين الكروت الفنية:" : "Performance Metrics Cards:"}
                        </span>
                        
                        {activeSec.data.elements?.map((item: any, idx: number) => (
                          <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2 relative">
                            <div className="flex justify-between items-center pb-1.5 border-b">
                              <span className="text-[10px] font-black text-slate-550">
                                {language === "ar" ? `مؤشر الأداء #${idx + 1}` : `SLA Metric #${idx + 1}`}
                              </span>
                              <input 
                                type="color" 
                                value={item.color || themeColor}
                                onChange={(e) => {
                                  const updatedElements = activeSec.data.elements?.map((el: any) => 
                                    el.id === item.id ? { ...el, color: e.target.value } : el
                                  );
                                  updateSectionData(activeSec.id, { elements: updatedElements });
                                }}
                                className="w-6 h-4 cursor-pointer"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 block">{language === "ar" ? "التسمية (عربي / English):" : "Label (AR / EN):"}</label>
                              <div className="flex gap-1.5">
                                <input 
                                  type="text" 
                                  value={item.labelAr} 
                                  onChange={(e) => {
                                    const updatedElements = activeSec.data.elements?.map((el: any) => 
                                      el.id === item.id ? { ...el, labelAr: e.target.value } : el
                                    );
                                    updateSectionData(activeSec.id, { elements: updatedElements });
                                  }}
                                  className="flex-1 p-1 bg-white border border-slate-200 rounded text-xs leading-none"
                                />
                                <input 
                                  type="text" 
                                  value={item.labelEn} 
                                  onChange={(e) => {
                                    const updatedElements = activeSec.data.elements?.map((el: any) => 
                                      el.id === item.id ? { ...el, labelEn: e.target.value } : el
                                    );
                                    updateSectionData(activeSec.id, { elements: updatedElements });
                                  }}
                                  className="flex-1 p-1 bg-white border border-slate-200 rounded text-xs leading-none"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 block">{language === "ar" ? "القيمة (عربي / English):" : "Value (AR / EN):"}</label>
                              <div className="flex gap-1.5">
                                <input 
                                  type="text" 
                                  value={item.valueAr} 
                                  onChange={(e) => {
                                    const updatedElements = activeSec.data.elements?.map((el: any) => 
                                      el.id === item.id ? { ...el, valueAr: e.target.value } : el
                                    );
                                    updateSectionData(activeSec.id, { elements: updatedElements });
                                  }}
                                  className="flex-1 p-1 bg-white border border-slate-200 rounded text-xs"
                                />
                                <input 
                                  type="text" 
                                  value={item.valueEn} 
                                  onChange={(e) => {
                                    const updatedElements = activeSec.data.elements?.map((el: any) => 
                                      el.id === item.id ? { ...el, valueEn: e.target.value } : el
                                    );
                                    updateSectionData(activeSec.id, { elements: updatedElements });
                                  }}
                                  className="flex-1 p-1 bg-white border border-slate-200 rounded text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dynamic grid Table log */}
                    {activeSec.type === "table" && (
                      <div className="space-y-3.5 bg-white p-3 rounded-xl border border-slate-200/65">
                        <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                          {language === "ar" ? "إعداد صفوف وأعمدة الجدول الفني:" : "System Data Table Rows:"}
                        </span>
                        
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-500 block">{language === "ar" ? "ستايل التلوين:" : "Table Theme Profiles:"}</label>
                          <select 
                            value={activeSec.data.tableTheme || "blue"}
                            onChange={(e) => updateSectionData(activeSec.id, { tableTheme: e.target.value })}
                            className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                          >
                            <option value="blue">{language === "ar" ? "خط الشركات الأزرق الموحد" : "Indigo Blue profile"}</option>
                            <option value="slate">{language === "ar" ? "رمادي فحمي هادئ" : "Charcoal Slate style"}</option>
                            <option value="emerald">{language === "ar" ? "أخضر جودة العمل" : "Emerald Quality theme"}</option>
                          </select>
                        </div>

                        {/* Quick Row Controller */}
                        <div className="flex gap-2 p-2 bg-slate-50 rounded-xl justify-between border border-slate-200/80">
                          <button
                            type="button"
                            onClick={() => {
                              const defaultCols = activeSec.data.headersAr?.length || 3;
                              const newRow = Array(defaultCols).fill("");
                              const updatedRows = [...(activeSec.data.rows || []), newRow];
                              updateSectionData(activeSec.id, { rows: updatedRows });
                            }}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{language === "ar" ? "إضافة صف" : "Add Row"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if ((activeSec.data.rows?.length || 0) > 1) {
                                const updatedRows = activeSec.data.rows?.slice(0, -1);
                                updateSectionData(activeSec.id, { rows: updatedRows });
                              }
                            }}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{language === "ar" ? "حذف صف أخير" : "Remove Last"}</span>
                          </button>
                        </div>

                        {/* Editable Spreadsheet cells */}
                        <div className="space-y-2 border-t pt-3 max-h-64 overflow-y-auto custom-scrollbar">
                          <span className="text-[9px] font-black text-slate-400 block mb-1 uppercase tracking-wide">
                            {language === "ar" ? "تعديل محتويات الخلايا:" : "Edit Row Columns:"}
                          </span>
                          
                          {activeSec.data.rows?.map((rowRef: string[], rIndex: number) => (
                            <div key={rIndex} className="p-2 border rounded-xl bg-slate-50/50 space-y-1">
                              <span className="text-[9.5px] font-black text-slate-500 block mb-1">
                                {language === "ar" ? `الصف رقم #${rIndex + 1}:` : `Row #${rIndex + 1}:`}
                              </span>
                              {rowRef.map((cellText: string, cIndex: number) => (
                                <div key={cIndex} className="flex gap-1.5 items-center">
                                  <span className="text-[9px] font-bold text-slate-400 w-12 shrink-0">
                                    {language === "ar" ? `العمود ${cIndex+1}` : `Col ${cIndex+1}`}
                                  </span>
                                  <input 
                                    type="text"
                                    value={cellText}
                                    onChange={(e) => {
                                      const updatedGrid = activeSec.data.rows?.map((rw: string[], ri: number) => 
                                        rw.map((cl: string, ci: number) => (ri === rIndex && ci === cIndex ? e.target.value : cl))
                                      );
                                      updateSectionData(activeSec.id, { rows: updatedGrid });
                                    }}
                                    className="flex-1 p-1 bg-white border border-slate-200 rounded text-[11px] font-bold"
                                  />
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Photo uploads config */}
                    {activeSec.type === "photos" && (
                      <div className="space-y-4 bg-white p-3 rounded-xl border border-slate-200/65">
                        <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                          {language === "ar" ? "تحميل لقطات الصيانة الميدانية:" : "Field Field Photos Profile:"}
                        </span>

                        {activeSec.data.files?.map((imgItem: any, capIdx: number) => (
                          <div key={capIdx} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2 relative">
                            <span className="text-[9.5px] font-black text-slate-500 block">
                              {language === "ar" ? `مربع الصورة رقم #${capIdx + 1}:` : `Photo Slot #${capIdx + 1}:`}
                            </span>

                            <div className="flex gap-2">
                              <label className="flex-1 flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-dashed border-slate-300 cursor-pointer hover:bg-slate-50/50 transition-colors">
                                <Upload className="w-4 h-4 text-slate-500 mb-1" />
                                <span className="text-[9.5px] font-extrabold text-slate-700">{language === "ar" ? "اختر صورة للمجال" : "Upload File"}</span>
                                <input 
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handlePhotoUpload(activeSec.id, capIdx, e.target.files?.[0])}
                                  className="hidden"
                                />
                              </label>

                              {imgItem.url && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedFiles = [...(activeSec.data.files || [])];
                                    updatedFiles[capIdx] = { ...updatedFiles[capIdx], url: "" };
                                    updateSectionData(activeSec.id, { files: updatedFiles });
                                  }}
                                  className="p-2 border rounded-lg bg-red-50 hover:bg-red-100 text-red-650 text-xs font-bold"
                                  title={language === "ar" ? "مسح الصورة" : "Clear Photo"}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 block">{language === "ar" ? "الوصف العربي:" : "Caption (AR):"}</label>
                              <input 
                                type="text"
                                value={imgItem.captionAr}
                                onChange={(e) => {
                                  const updatedFiles = [...(activeSec.data.files || [])];
                                  updatedFiles[capIdx] = { ...updatedFiles[capIdx], captionAr: e.target.value };
                                  updateSectionData(activeSec.id, { files: updatedFiles });
                                }}
                                className="w-full p-1 bg-white border border-slate-200 rounded text-xs font-semibold"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 block">{language === "ar" ? "الوصف الإنجليزي:" : "Caption (EN):"}</label>
                              <input 
                                type="text"
                                value={imgItem.captionEn}
                                onChange={(e) => {
                                  const updatedFiles = [...(activeSec.data.files || [])];
                                  updatedFiles[capIdx] = { ...updatedFiles[capIdx], captionEn: e.target.value };
                                  updateSectionData(activeSec.id, { files: updatedFiles });
                                }}
                                className="w-full p-1 bg-white border border-slate-200 rounded text-xs font-semibold"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Signatures & Seal text customized fields */}
                    {activeSec.type === "signatures" && (
                      <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-200/65">
                        <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                          {language === "ar" ? "تعديل تسميات الأختام والتواقيع:" : "Signature & Sealed Blocks:"}
                        </span>

                        <label className="flex items-center gap-2 cursor-pointer pb-2 border-b">
                          <input 
                            type="checkbox" 
                            checked={activeSec.data.showSeal}
                            onChange={(e) => updateSectionData(activeSec.id, { showSeal: e.target.checked })}
                            className="rounded border-slate-350 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-bold text-slate-700">
                            {language === "ar" ? "عرض الختم الرقمي المعتمد" : "Show verification Seal"}
                          </span>
                        </label>

                        {activeSec.data.showSeal && (
                          <div className="space-y-2">
                            <div>
                              <label className="text-[9px] font-bold text-slate-550 block mb-1">{language === "ar" ? "نص الختم بالأنظمة (عربي):" : "Seal (AR):"}</label>
                              <input 
                                type="text"
                                value={activeSec.data.sealTextAr}
                                onChange={(e) => updateSectionData(activeSec.id, { sealTextAr: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-550 block mb-1">{language === "ar" ? "نص الختم بالأنظمة (إنجليزي):" : "Seal (EN):"}</label>
                              <input 
                                type="text"
                                value={activeSec.data.sealTextEn}
                                onChange={(e) => updateSectionData(activeSec.id, { sealTextEn: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:bg-white"
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 border-t pt-2 mt-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-550 block mb-1">{language === "ar" ? "جهة الطرف الأول (عربي/إنجليزي):" : "First Party Stamp Name (AR / EN):"}</label>
                            <div className="flex gap-1.5">
                              <input 
                                type="text"
                                value={activeSec.data.partyOneTitleAr}
                                onChange={(e) => updateSectionData(activeSec.id, { partyOneTitleAr: e.target.value })}
                                className="flex-1 p-1 bg-slate-50 border rounded text-xs font-bold"
                              />
                              <input 
                                type="text"
                                value={activeSec.data.partyOneTitleEn}
                                onChange={(e) => updateSectionData(activeSec.id, { partyOneTitleEn: e.target.value })}
                                className="flex-1 p-1 bg-slate-50 border rounded text-xs font-bold"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-slate-550 block mb-1">{language === "ar" ? "جهة الطرف الثاني (عربي/إنجليزي):" : "Second Party Receiver Name (AR / EN):"}</label>
                            <div className="flex gap-1.5">
                              <input 
                                type="text"
                                value={activeSec.data.partyTwoTitleAr}
                                onChange={(e) => updateSectionData(activeSec.id, { partyTwoTitleAr: e.target.value })}
                                className="flex-1 p-1 bg-slate-50 border rounded text-xs font-bold border-slate-200"
                              />
                              <input 
                                type="text"
                                value={activeSec.data.partyTwoTitleEn}
                                onChange={(e) => updateSectionData(activeSec.id, { partyTwoTitleEn: e.target.value })}
                                className="flex-1 p-1 bg-slate-50 border rounded text-xs font-bold border-slate-200"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })()
            ) : (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl text-center text-blue-800 space-y-2">
                  <Info className="w-5 h-5 mx-auto text-blue-500 animate-bounce" />
                  <p className="text-[11px] font-black leading-normal">
                    {language === "ar" 
                      ? "اضغط على أي قسم من أقسام التقرير الحالية أدناه لتعديله وتنسيقه فوراً:" 
                      : "Click any of the active report sections below to instantly edit its parameters:"}
                  </p>
                </div>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                  {sections.map((sec, idx) => {
                    const iconMap: { [key: string]: React.ReactNode } = {
                      header: <Layout className="w-4 h-4 text-cyan-500" />,
                      summary: <Type className="w-4 h-4 text-blue-500" />,
                      metrics: <Columns className="w-4 h-4 text-emerald-500" />,
                      table: <Table className="w-4 h-4 text-indigo-500" />,
                      photos: <FileImage className="w-4 h-4 text-amber-500" />,
                      signatures: <Award className="w-4 h-4 text-red-500" />,
                      divider: <Square className="w-4 h-4 text-purple-500" />
                    };
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setActiveSectionId(sec.id)}
                        className="w-full p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between transition-all active:scale-[0.98] shadow-3xs cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="shrink-0">
                            {iconMap[sec.type] || <FileText className="w-4 h-4" />}
                          </span>
                          <span className="truncate max-w-[140px]">{language === "ar" ? sec.titleAr : sec.titleEn}</span>
                        </div>
                        <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-black tracking-wider font-mono shrink-0">
                          {sec.type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* 2. Main Live Interactive Editor Workspace (Center & Right Panel) */}
      <div className="flex-1 flex flex-col min-w-0 select-none bg-slate-100 overflow-hidden">
        
        {/* Core Control Action Bar */}
        <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between no-print shadow-2xs shrink-0 select-none">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-xs font-black text-slate-600">
              {language === "ar" ? "لوحة معايرة هيكل التقرير التفاعلي" : "Structured Layout Real-Time Renderer"}
            </span>
          </div>

          <div className="flex gap-2 shrink-0 items-center">
            {/* Elegant Zoom Scale Indicator Control Panel for variable workspace viewports */}
            <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-[11px] font-mono font-bold text-slate-600">
              <button 
                type="button"
                onClick={() => setZoomScale(prev => Math.max(0.4, Number((prev - 0.05).toFixed(2))))}
                className="w-5 h-5 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-150 rounded-lg shadow-3xs cursor-pointer text-slate-800 font-extrabold text-xs transition-transform active:scale-95"
                title={language === "ar" ? "تصغير المعاينة" : "Zoom out document"}
              >
                -
              </button>
              <span className="px-1.5 min-w-[34px] text-center select-none">{Math.round(zoomScale * 100)}%</span>
              <button 
                type="button"
                onClick={() => setZoomScale(prev => Math.min(1.5, Number((prev + 0.05).toFixed(2))))}
                className="w-5 h-5 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-150 rounded-lg shadow-3xs cursor-pointer text-slate-800 font-extrabold text-xs transition-transform active:scale-95"
                title={language === "ar" ? "تكبير المعاينة" : "Zoom in document"}
              >
                +
              </button>
            </div>

            <button
              onClick={() => {
                if (window.confirm(language === "ar" ? "هل أنت متأكد من إعادة ضبط التقرير؟" : "Are you sure you want to reset all document layers?")) {
                  window.location.reload();
                }
              }}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "ضبط وتفريغ" : "Reset Canvas"}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>{language === "ar" ? "طباعة وحفظ كملف PDF" : "Print & Export PDF Document"}</span>
            </button>
          </div>
        </div>

        {/* Content Layout Grid (Split to Preview + Inspector Panel) */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* Printable boundaries wrapper with scalable document boundaries container */}
          <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start custom-scrollbar">
            <div 
              className="origin-top shrink-0 py-4 transition-transform duration-100" 
              style={{ 
                transform: `scale(${zoomScale})`, 
                transformOrigin: "top center", 
                marginBottom: `calc(297mm * (${zoomScale} - 1))` 
              }}
            >
              <div 
                ref={printAreaRef}
                className={`bg-white shadow-2xl relative transition-all duration-300 font-sans select-text shrink-0 print-no-shadow print-m-0`}
                style={{
                  width: "210mm", // standard A4 portrait width
                  minHeight: "297mm", // standard A4 portrait minimum height
                  padding: "20mm 15mm 20mm 15mm",
                  fontFamily: "Cairo, Tajawal, 'Inter', sans-serif"
                }}
              >
              {/* Optional page border layout render */}
              {borderStyle !== "none" && (
                <div 
                  className={`absolute pointer-events-none print-border-deco`}
                  style={{
                    inset: "8mm",
                    border: borderStyle === "simple" 
                      ? `1.5px solid ${borderColor}`
                      : borderStyle === "royal"
                      ? `3.5px double ${borderColor}`
                      : `2.5px solid ${borderColor}`,
                    borderStyle: borderStyle === "tech" ? "dashed" : "solid",
                    borderRadius: borderStyle === "tech" ? "12px" : "0px",
                    zIndex: 0
                  }}
                />
              )}

              {/* Decorative brackets for tech layout */}
              {borderStyle === "tech" && (
                <>
                  <div className="absolute top-[6mm] left-[6mm] w-3 h-3 border-t-2 border-l-2 print-border-deco" style={{ borderColor }} />
                  <div className="absolute top-[6mm] right-[6mm] w-3 h-3 border-t-2 border-r-2 print-border-deco" style={{ borderColor }} />
                  <div className="absolute bottom-[6mm] left-[6mm] w-3 h-3 border-b-2 border-l-2 print-border-deco" style={{ borderColor }} />
                  <div className="absolute bottom-[6mm] right-[6mm] w-3 h-3 border-b-2 border-r-2 print-border-deco" style={{ borderColor }} />
                </>
              )}

              {/* Watermark Element */}
              {watermark && (
                <div 
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
                  style={{ opacity: 0.05 }}
                >
                  <span className="text-6xl font-black rotate-45 select-none text-slate-900 tracking-widest leading-none">
                    {watermark}
                  </span>
                </div>
              )}

              {/* Core Printable Contents Stack */}
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  {sections.map((section, idx) => {
                    const isActive = activeSectionId === section.id;
                    return (
                      <div 
                        key={section.id}
                        onClick={() => { setActiveSectionId(section.id); setSidebarTab("editor"); }}
                        className={`group relative mb-4 border transition-all duration-150 ${isActive ? "border-blue-500 bg-blue-50/10 ring-2 ring-blue-500/20 rounded-xl" : "border-transparent hover:border-slate-200 hover:bg-slate-50/40 rounded-lg"} cursor-pointer p-3 print:mb-4 print:p-0 print:border-transparent print:bg-transparent print:ring-0`}
                      >
                        {/* Interactive drag-reorder toolbar floating above active section on hover */}
                        <div className="absolute -top-3.5 right-3 px-2 py-0.5 bg-blue-600 text-white rounded-md text-[9px] font-black items-center gap-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity no-print flex z-20">
                          <span>{language === "ar" ? section.titleAr : section.titleEn}</span>
                          <div className="h-3 w-[1px] bg-blue-400 mx-1" />
                          <button 
                            disabled={idx === 0}
                            onClick={(e) => { e.stopPropagation(); moveSection("up", idx); }}
                            className="hover:text-amber-400 disabled:opacity-40"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button 
                            disabled={idx === sections.length - 1}
                            onClick={(e) => { e.stopPropagation(); moveSection("down", idx); }}
                            className="hover:text-amber-400 disabled:opacity-40"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                            className="hover:text-red-300 ml-1.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Rendering Section Types strictly without any overlaps */}
                        {section.styles.showTitle && (
                          <h4 
                            className="text-xs font-black border-b pb-1.5 mb-2.5 flex items-center gap-2"
                            style={{ color: themeColor, borderColor: `${themeColor}22` }}
                          >
                            <div className="w-1.5 h-3 bg-blue-600 rounded-xs" style={{ backgroundColor: themeColor }} />
                            <span>{language === "ar" ? section.titleAr : section.titleEn}</span>
                          </h4>
                        )}

                        {/* A. Header Section */}
                        {section.type === "header" && (
                          <div className="flex justify-between items-start pb-4 border-b-2 mb-2" style={{ borderColor: themeColor }}>
                            <div className="space-y-1.5 max-w-[70%]">
                              <h2 className="text-base font-black text-slate-900 leading-tight">
                                {language === "ar" ? settings.systemTitleAr : settings.systemTitleEn}
                              </h2>
                              <p className="text-[10px] text-slate-500 font-bold leading-normal">
                                {language === "ar" ? section.data.textAr : section.data.textEn}
                              </p>
                              <p className="text-[9px] text-gray-400 font-mono font-bold">
                                {language === "ar" 
                                  ? `${settings.companyAddressAr || "الرياض، المملكة العربية السعودية"} | هاتف: ${settings.companyPhone || "920084729"}`
                                  : `${settings.companyAddressEn || "Riyadh, KSA"} | Tel: ${settings.companyPhone || "920084729"}`
                                }
                              </p>
                            </div>

                            <div className="flex flex-col items-center shrink-0">
                              <div className="w-12 h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center p-1.5 overflow-hidden shrink-0 shadow-2xs [&_svg]:w-full [&_svg]:h-full [&_svg]:max-w-full [&_svg]:max-h-full [&_img]:w-full [&_img]:h-full [&_img]:object-contain">
                                {settings.systemLogo ? (
                                  <div dangerouslySetInnerHTML={{ __html: settings.systemLogo }} className="w-full h-full flex items-center justify-center" />
                                ) : (
                                  <span className="text-[9px] font-black text-blue-700">Logo</span>
                                )}
                              </div>
                              <span className="text-[7.5px] font-mono tracking-widest text-slate-800 font-black mt-1 uppercase" style={{ color: themeColor }}>
                                {language === "ar" ? "تقرير معتمد" : "OFFICIAL SLA"}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* B. Executive Summary / Text Block */}
                        {section.type === "summary" && (
                          <div 
                            className="leading-relaxed font-semibold mb-2"
                            style={{ 
                              textAlign: section.data.textAlign || (language === "ar" ? "right" : "left"),
                              fontSize: section.data.fontSize === "sm" ? "12px" : section.data.fontSize === "lg" ? "16px" : section.data.fontSize === "xl" ? "18px" : "14px",
                              color: "#334155"
                            }}
                          >
                            <p className="whitespace-pre-line leading-relaxed">
                              {language === "ar" ? section.data.textAr : section.data.textEn}
                            </p>
                          </div>
                        )}

                        {/* C. Metrics Stats Section */}
                        {section.type === "metrics" && (
                          <div className="grid grid-cols-3 gap-3 my-2">
                            {section.data.elements?.map((item: any) => (
                              <div 
                                key={item.id} 
                                className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col justify-between h-16 shadow-2xs relative overflow-hidden"
                              >
                                <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: item.color || themeColor }} />
                                <span className="text-[9px] font-bold text-slate-400 block truncate">
                                  {language === "ar" ? item.labelAr : item.labelEn}
                                </span>
                                <span className="text-sm font-black mt-1" style={{ color: item.color || "#000" }}>
                                  {language === "ar" ? item.valueAr : item.valueEn}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* D. Data Table Form Section */}
                        {section.type === "table" && (
                          <div className="overflow-x-auto my-2 border border-slate-200 rounded-xl shadow-3xs">
                            <table className="w-full text-xs font-semibold select-text">
                              <thead>
                                <tr className="bg-slate-100 border-b border-slate-200">
                                  {(language === "ar" ? section.data.headersAr : section.data.headersEn)?.map((head: string, hidx: number) => (
                                    <th 
                                      key={hidx} 
                                      className={`p-2.5 text-[11px] font-black text-white ${language === "ar" ? "text-right" : "text-left"}`}
                                      style={{ backgroundColor: themeColor }}
                                    >
                                      {head}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {section.data.rows?.map((row: string[], rowIdx: number) => (
                                  <tr 
                                    key={rowIdx} 
                                    className={`border-b border-slate-150 hover:bg-slate-50/50 ${rowIdx % 2 === 1 ? "bg-slate-50/30" : "bg-white"}`}
                                  >
                                    {row.map((cell: string, cellIdx: number) => (
                                      <td key={cellIdx} className="p-2.5 text-slate-700 leading-normal font-bold">
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* E. Photos showcase */}
                        {section.type === "photos" && (
                          <div className="grid grid-cols-2 gap-4 my-2">
                            {section.data.files?.map((img: any, imgIdx: number) => (
                              <div key={imgIdx} className="border border-slate-150 rounded-xl p-2 bg-slate-50/50 flex flex-col justify-between">
                                <label className="h-32 bg-slate-200/50 rounded-lg flex items-center justify-center overflow-hidden relative group cursor-pointer hover:bg-slate-300/35 transition-colors no-print">
                                  {img.url ? (
                                    <img src={img.url} alt="Field Shot" className="w-full h-full object-cover animate-in fade-in" />
                                  ) : (
                                    <div className="text-center space-y-1 text-slate-400">
                                      <Upload className="w-6 h-6 mx-auto mb-1 opacity-70 group-hover:scale-105 transition-transform" />
                                      <p className="text-[9px] font-black">{language === "ar" ? "اضغط لرفع الصورة" : "Click to upload image"}</p>
                                    </div>
                                  )}
                                  <input 
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handlePhotoUpload(section.id, imgIdx, e.target.files?.[0])}
                                    className="hidden"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </label>
                                {/* Static image presentation safe for printing workflow */}
                                {img.url && (
                                  <div className="hidden print:block h-32 bg-slate-200/50 rounded-lg overflow-hidden">
                                    <img src={img.url} alt="Field Shot" className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <span className="text-[10px] text-slate-500 font-extrabold text-center mt-2 truncate">
                                  {language === "ar" ? img.captionAr : img.captionEn}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* F. Signatures & Badges */}
                        {section.type === "signatures" && (
                          <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between gap-6">
                            
                            {/* Party 1 */}
                            <div className="flex-1 border border-slate-100 rounded-xl p-3.5 bg-slate-50/40 relative">
                              <h5 className="text-[10px] font-black text-slate-400 mb-2 uppercase border-b pb-1">
                                {language === "ar" ? section.data.partyOneTitleAr : section.data.partyOneTitleEn}
                              </h5>
                              <div className="h-10 flex items-center justify-center">
                                {section.data.showSeal && (
                                  <div 
                                    className="border-2 border-dashed rounded-md px-2.5 py-1 text-[8.5px] font-black font-mono rotate-6 select-none opacity-85"
                                    style={{ color: themeColor, borderColor: `${themeColor}aa`, backgroundColor: `${themeColor}05` }}
                                  >
                                    {language === "ar" ? section.data.sealTextAr : section.data.sealTextEn}
                                  </div>
                                )}
                              </div>
                              <div className="text-[8.5px] font-bold text-slate-400 text-center uppercase tracking-wide mt-2">
                                {language === "ar" ? "توقيع معتمد رقمياً" : "Digitally Sealed Signature"}
                              </div>
                            </div>

                            {/* Party 2 */}
                            <div className="flex-1 border border-slate-100 rounded-xl p-3.5 bg-slate-50/40">
                              <h5 className="text-[10px] font-black text-slate-400 mb-2 uppercase border-b pb-1">
                                {language === "ar" ? section.data.partyTwoTitleAr : section.data.partyTwoTitleEn}
                              </h5>
                              <div className="h-10 flex items-center justify-center">
                                <div className="w-14 h-4 border-b border-dashed border-slate-300" />
                              </div>
                              <div className="text-[8.5px] font-bold text-slate-400 text-center uppercase tracking-wide mt-2">
                                {language === "ar" ? "توقيع المستلم المكلف" : "Signature of Receipt"}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* G. Divider Section */}
                        {section.type === "divider" && (
                          <div className="py-2">
                            <div className="h-[1.5px] w-full" style={{ backgroundColor: `${themeColor}33`, borderStyle: "dashed" }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer validation */}
                <div 
                  className="mt-8 pt-2.5 border-t border-slate-150 text-center text-[8.5px] font-mono leading-none tracking-wide"
                  style={{ color: themeColor }}
                >
                  {language === "ar" 
                    ? `وثيقة رسمية تم إصدارها عبر محرك تقارير ${settings.systemTitleAr || "إتقان"} الموحد`
                    : `Official alignment asset produced and verified via ${settings.systemTitleEn || "ITQAN"} engine`
                  }
                </div>
              </div>
            </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
