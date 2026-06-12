import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, getDoc, getDocs } from "firebase/firestore";

const app = express();
// Use port 3000 in cloud sandbox environments (like Google AI Studio / Cloud Run) to maintain external ingress connectivity.
// On normal local development machines, fallback to port 3100 (or user-defined PORT env var) to prevent local conflicts as requested.
const IS_CLOUD = !!(process.env.K_SERVICE || process.env.K_REVISION || process.env.AISTUDIO_APPLET || process.env.CONTAINER_SANDBOX);
const PORT = IS_CLOUD ? 3000 : (process.env.PORT ? parseInt(process.env.PORT, 10) : 3100);
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Load Firebase configuration dynamically to prevent issues with JSON imports under modern Node runtimes on Vercel
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));

const firebaseApp = initializeApp(firebaseConfig);

// Initialize with experimentalForceLongPolling: true to ensure extremely robust connections under serverless functions/Vercel
const db = initializeFirestore(firebaseApp, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

// Interfaces
interface TicketUpdate {
  timestamp: string;
  message: string;
  author: string;
}

interface FieldReport {
  completionNotes: string;
  beforeImage: string | null;
  afterImage: string | null;
  signature: string | null;
  reportTimestamp: string | null;
  gps: { latitude: number; longitude: number } | null;
}

interface Ticket {
  id: string;
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  assignedTechnician: string | null;
  createdAt: string;
  scheduledDate: string;
  closedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  updates: TicketUpdate[];
  fieldReport: FieldReport | null;
  expenseCost: number;
}

interface Contract {
  id: string;
  customerName: string;
  contractType: string;
  location: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  visitInterval: "weekly" | "biweekly" | "monthly" | "quarterly" | "custom";
  visitIntervalValue: number; // number of days
  lastVisitDate: string | null;
  nextVisitDate: string;
  status: "Active" | "Expired" | "Pending";
  createdAt: string;
  notes?: string;
}

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
  createdAt?: string;
  nextInvoiceDate?: string;
}

interface EmployeeDocument {
  id: string;
  name: string;        // Name or Type in Arabic (e.g., "إقامة", "رخصة العمل", "رخصة القيادة")
  nameEn: string;      // English translation
  docNumber: string;   // License / doc number
  expiryDate: string;  // Expiry date (YYYY-MM-DD)
  dataUrl?: string;    // Base64 document attachment
  fileName?: string;   // Original uploaded file name
}

interface Employee {
  id: string;
  name: string;
  role: string;
  joinDate: string;
  phoneNumber?: string;
  email?: string;
  documents: EmployeeDocument[];
  createdAt: string;
}

interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
}

interface SystemSettings {
  systemTitleAr: string;
  systemTitleEn: string;
  systemLogo: string;
  adminPasswordHash: string;
  language: "ar" | "en";
  categories?: Category[];
  technicians?: string[];
  companyAddressAr?: string;
  companyAddressEn?: string;
  companyPhone?: string;
}

const DEFAULT_TECHNICIANS: string[] = [
  "م. أحمد الشمري",
  "م. خالد الحربي",
  "م. ياسر القحطاني",
  "م. فهد العتيبي",
  "م. عبدالرحمن الدوسري"
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: "HVAC", nameAr: "تكييف وتبريد", nameEn: "HVAC" },
  { id: "Electrical", nameAr: "أعمال كهربائية", nameEn: "Electrical" },
  { id: "Plumbing", nameAr: "سباكة وأنابيب", nameEn: "Plumbing" },
  { id: "General", nameAr: "صيانة عامة ومقاولات", nameEn: "General" }
];

const DEFAULT_SETTINGS: SystemSettings = {
  systemTitleAr: "إتقان لخدمات الصيانة الميدانية",
  systemTitleEn: "ITQAN Field Service Management",
  systemLogo: `<svg viewBox="0 0 100 100" class="w-10 h-10 text-blue-600 transition-transform hover:scale-105" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="8" class="text-blue-600" />
    <circle cx="50" cy="50" r="30" stroke="currentColor" stroke-width="4" stroke-dasharray="10 5" class="text-amber-500" />
    <path d="M50 25V50L65 60" stroke="currentColor" stroke-width="6" stroke-linecap="round" class="text-blue-800" />
    <path d="M42 35H58" stroke="currentColor" stroke-width="4" stroke-linecap="round" class="text-orange-500" />
  </svg>`,
  adminPasswordHash: "admin123",
  language: "ar",
  categories: DEFAULT_CATEGORIES,
  technicians: DEFAULT_TECHNICIANS,
  companyAddressAr: "الرياض، المملكة العربية السعودية",
  companyAddressEn: "Riyadh, Kingdom of Saudi Arabia",
  companyPhone: "920084729"
};

let cachedTickets: Ticket[] = [];
let cachedSettings: SystemSettings = DEFAULT_SETTINGS;
let cachedContracts: Contract[] = [];
let cachedQuotations: Quotation[] = [];
let cachedEmployees: Employee[] = [];

// Initialize listeners (Only if not running in Vercel Serverless environment to prevent connection leaks/timeouts)
if (!process.env.VERCEL) {
  onSnapshot(collection(db, "tickets"), (snapshot) => {
    cachedTickets = snapshot.docs.map(d => d.data() as Ticket).sort((a,b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    io.emit("ticketsUpdated", cachedTickets);
  }, (error) => {
    console.error("Firestore 'tickets' sync error (Rules might be deploying):", error.message);
  });

  onSnapshot(doc(db, "settings", "global"), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data() as SystemSettings;
      let mutated = false;
      if (!data.categories) { data.categories = DEFAULT_CATEGORIES; mutated = true; }
      if (!data.technicians) { data.technicians = DEFAULT_TECHNICIANS; mutated = true; }
      cachedSettings = data;
      if (mutated) {
        setDoc(doc(db, "settings", "global"), cachedSettings).catch(console.error);
      }
    } else {
      cachedSettings = DEFAULT_SETTINGS;
      setDoc(doc(db, "settings", "global"), DEFAULT_SETTINGS).catch(console.error);
    }
    io.emit("settingsUpdated", cachedSettings);
  }, (error) => {
    console.error("Firestore 'settings' sync error:", error.message);
  });

  onSnapshot(collection(db, "contracts"), (snapshot) => {
    cachedContracts = snapshot.docs.map(d => d.data() as Contract).sort((a,b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    io.emit("contractsUpdated", cachedContracts);
  }, (error) => {
    console.error("Firestore 'contracts' sync error:", error.message);
  });

  onSnapshot(collection(db, "quotations"), (snapshot) => {
    cachedQuotations = snapshot.docs.map(d => d.data() as Quotation).sort((a,b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    io.emit("quotationsUpdated", cachedQuotations);
  }, (error) => {
    console.error("Firestore 'quotations' sync error:", error.message);
  });

  onSnapshot(collection(db, "employees"), (snapshot) => {
    cachedEmployees = snapshot.docs.map(d => d.data() as Employee).sort((a,b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    io.emit("employeesUpdated", cachedEmployees);
  }, (error) => {
    console.error("Firestore 'employees' sync error:", error.message);
  });
}

function readTickets(): Ticket[] { return cachedTickets; }
function readContracts(): Contract[] { return cachedContracts; }
function readQuotations(): Quotation[] { return cachedQuotations; }
function readEmployees(): Employee[] { return cachedEmployees; }
function readSettings(): SystemSettings { return cachedSettings; }

// ---------------------- ENDPOINTS ----------------------

app.post("/api/auth/login", async (req, res) => {
  try {
    const snap = await getDoc(doc(db, "settings", "global"));
    const currentSettings = snap.exists() ? (snap.data() as SystemSettings) : DEFAULT_SETTINGS;
    const { password } = req.body;
    if (password === currentSettings.adminPasswordHash) {
      res.json({ success: true, token: "itqan-admin-token-secure-hybrid" });
    } else {
      res.status(401).json({ success: false, errorAr: "كلمة المرور غير صحيحة", errorEn: "Incorrect password" });
    }
  } catch(e: any) {
    console.error("Login database connection failure:", e);
    res.status(500).json({ 
      success: false, 
      errorAr: `فشل الاتصال بقاعدة بيانات السحاب: ${e?.message || e}`, 
      errorEn: `Cloud database connection failed: ${e?.message || e}`
    });
  }
});

app.get("/api/tickets", async (req, res) => {
  try {
    const snap = await getDocs(collection(db, "tickets"));
    const results = snap.docs.map(d => d.data() as Ticket).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(results);
  } catch (err) {
    res.json(readTickets());
  }
});

app.get("/api/tickets/:id", async (req, res) => {
  try {
    const snap = await getDoc(doc(db, "tickets", req.params.id));
    if (!snap.exists()) {
      return res.status(404).json({ errorAr: "التذكرة غير موجودة", errorEn: "Ticket not found" });
    }
    res.json(snap.data());
  } catch(e) {
    const tickets = readTickets();
    const ticket = tickets.find(t => t.id === req.params.id);
    if (!ticket) return res.status(404).json({ errorAr: "التذكرة غير موجودة", errorEn: "Ticket not found" });
    res.json(ticket);
  }
});

app.post("/api/tickets", async (req, res) => {
  try {
    const snap = await getDocs(collection(db, "tickets"));
    const tickets = snap.docs.map(d => d.data() as Ticket);
    const nextIdNum = tickets.reduce((acc, t) => {
      const num = parseInt(t.id.replace("ITQAN-", ""), 10);
      return num > acc ? num : acc;
    }, 1000) + 1;

    const newTicket: Ticket = {
      id: `ITQAN-${nextIdNum}`,
      customerName: req.body.customerName || "غير محدد",
      customerPhone: req.body.customerPhone || "",
      customerLocation: req.body.customerLocation || "",
      category: req.body.category || "General",
      priority: req.body.priority || "Medium",
      status: req.body.status || "Pending",
      description: req.body.description || "",
      assignedTechnician: req.body.assignedTechnician || null,
      createdAt: new Date().toISOString(),
      scheduledDate: req.body.scheduledDate || new Date().toISOString().split("T")[0],
      closedAt: null,
      latitude: req.body.latitude || 24.7136,
      longitude: req.body.longitude || 46.6753,
      updates: [{
        timestamp: new Date().toISOString(),
        message: "تم إنشاء طلب الخدمة صيانة جديدة بنجاح في النظام.",
        author: "مقدم الخدمة (خدمة العملاء)"
      }],
      fieldReport: null,
      expenseCost: req.body.expenseCost || 0
    };

    if (newTicket.assignedTechnician) {
      newTicket.updates.push({
        timestamp: new Date().toISOString(),
        message: `تم إرساء المهمة مباشرة للمهندس الميداني: ${newTicket.assignedTechnician}.`,
        author: "مسؤول العمليات والتشغيل"
      });
      newTicket.status = "Assigned";
    }

    await setDoc(doc(db, "tickets", newTicket.id), newTicket);
    res.status(201).json(newTicket);
  } catch(e) {
    console.error(e);
    res.status(500).json({ errorAr: "فشل الحفظ", errorEn: "Failed to save" });
  }
});

app.put("/api/tickets/:id", async (req, res) => {
  try {
    const snap = await getDoc(doc(db, "tickets", req.params.id));
    if (!snap.exists()) return res.status(404).json({ errorAr: "التذكرة غير موجودة", errorEn: "Ticket not found" });
    const oldTicket = snap.data() as Ticket;

    const updatedTicket = { ...oldTicket, ...req.body };

    if (req.body.assignedTechnician && oldTicket.assignedTechnician !== req.body.assignedTechnician) {
      updatedTicket.updates.push({
        timestamp: new Date().toISOString(),
        message: `تم تغيير المهندس الميداني المعيّن وتوجيه التذكرة إلى: ${req.body.assignedTechnician}`,
        author: "مسؤول العمليات والتشغيل"
      });
      if (updatedTicket.status === "Pending") updatedTicket.status = "Assigned";
    }

    if (req.body.status && oldTicket.status !== req.body.status) {
      updatedTicket.updates.push({
        timestamp: new Date().toISOString(),
        message: `تحديث حالة التذكرة إدارياً من [${oldTicket.status}] إلى [${req.body.status}]`,
        author: "مسؤول النظام"
      });
      if (req.body.status === "Closed" && !oldTicket.closedAt) {
        updatedTicket.closedAt = new Date().toISOString();
      }
    }

    await setDoc(doc(db, "tickets", updatedTicket.id), updatedTicket);
    res.json(updatedTicket);
  } catch(e) {
    console.error(e);
    res.status(500).json({ errorAr: "فشل التحديث", errorEn: "Update failed" });
  }
});

app.delete("/api/tickets/:id", async (req, res) => {
  try {
    await deleteDoc(doc(db, "tickets", req.params.id));
    res.json({ success: true, deletedId: req.params.id });
  } catch(e) {
    console.error(e);
    res.status(500).json({ errorAr: "فشل الحذف", errorEn: "Deletion failed" });
  }
});

app.post("/api/tickets/:id/field-report", async (req, res) => {
  try {
    const snap = await getDoc(doc(db, "tickets", req.params.id));
    if (!snap.exists()) return res.status(404).json({ errorAr: "التذكرة غير موجودة", errorEn: "Ticket not found" });
    const ticket = snap.data() as Ticket;

    const { completionNotes, beforeImage, afterImage, signature, gps, status, expenseCost } = req.body;

    ticket.fieldReport = {
      completionNotes: completionNotes || "تم الانتهاء من العمل الميداني وإرساله.",
      beforeImage: beforeImage || ticket.fieldReport?.beforeImage || null,
      afterImage: afterImage || ticket.fieldReport?.afterImage || null,
      signature: signature || null,
      reportTimestamp: new Date().toISOString(),
      gps: gps || null
    };

    if (expenseCost !== undefined) ticket.expenseCost = Number(expenseCost);

    ticket.status = status || "In QA Review";

    ticket.updates.push({
      timestamp: new Date().toISOString(),
      message: `تقديم تقرير الصيانة واستلام التحديثات الميدانية. الملاحظات: "${completionNotes}". الجورنال الجغرافي محدث.`,
      author: `${ticket.assignedTechnician || "المهندس الميداني"}`
    });

    if (ticket.status === "Completed") ticket.closedAt = new Date().toISOString();

    await setDoc(doc(db, "tickets", ticket.id), ticket);
    res.json({ success: true, ticket });
  } catch(e) {
    console.error(e);
    res.status(500).json({ errorAr: "فشل الحفظ", errorEn: "Save failed" });
  }
});

app.get("/api/backup", (req, res) => {
  res.json({ tickets: readTickets(), settings: readSettings(), contracts: readContracts() });
});

app.post("/api/restore", async (req, res) => {
  try {
    const { tickets, settings, contracts } = req.body;
    if (!tickets || !settings) return res.status(400).json({ errorAr: "محتوى النسخة الاحتياطية غير صالح", errorEn: "Invalid backup content" });
    
    for (const t of tickets) {
      await setDoc(doc(db, "tickets", t.id), t);
    }
    await setDoc(doc(db, "settings", "global"), settings);
    
    if (contracts && Array.isArray(contracts)) {
      for (const c of contracts) {
        await setDoc(doc(db, "contracts", c.id), c);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ errorAr: "فشل الاستيراد", errorEn: "Restore failed" });
  }
});

app.get("/api/contracts", async (req, res) => {
  try {
    const snap = await getDocs(collection(db, "contracts"));
    const results = snap.docs.map(d => d.data() as Contract).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(results);
  } catch (err) {
    res.json(readContracts());
  }
});

app.post("/api/contracts", async (req, res) => {
  try {
    const snap = await getDocs(collection(db, "contracts"));
    const contracts = snap.docs.map(d => d.data() as Contract);
    const nextIdNum = contracts.reduce((acc, c) => {
      const match = c.id.match(/CONTRACT-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > acc ? num : acc;
      }
      return acc;
    }, 1000) + 1;

    const newContract: Contract = {
      id: `CONTRACT-${nextIdNum}`,
      customerName: req.body.customerName || "عميل غير محدد",
      contractType: req.body.contractType || "عقد صيانة وقائية",
      location: req.body.location || "الموقع الرئيسي",
      startDate: req.body.startDate || new Date().toISOString().split("T")[0],
      endDate: req.body.endDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split("T")[0],
      durationMonths: Number(req.body.durationMonths) || 12,
      visitInterval: req.body.visitInterval || "monthly",
      visitIntervalValue: Number(req.body.visitIntervalValue) || 30,
      lastVisitDate: req.body.lastVisitDate || null,
      nextVisitDate: req.body.nextVisitDate || new Date().toISOString().split("T")[0],
      status: req.body.status || "Active",
      createdAt: new Date().toISOString(),
      notes: req.body.notes || ""
    };

    await setDoc(doc(db, "contracts", newContract.id), newContract);
    res.status(201).json(newContract);
  } catch (err) {
    console.error(err);
    res.status(500).json({ errorAr: "فشل إضافة العقد", errorEn: "Failed to add contract" });
  }
});

app.put("/api/contracts/:id", async (req, res) => {
  try {
    const snap = await getDoc(doc(db, "contracts", req.params.id));
    if (!snap.exists()) return res.status(404).json({ errorAr: "العقد غير موجود", errorEn: "Contract not found" });
    const oldContract = snap.data() as Contract;

    const updatedContract = { ...oldContract, ...req.body };

    await setDoc(doc(db, "contracts", updatedContract.id), updatedContract);
    res.json(updatedContract);
  } catch (err) {
    console.error(err);
    res.status(500).json({ errorAr: "فشل تحديث العقد", errorEn: "Failed to update contract" });
  }
});

app.delete("/api/contracts/:id", async (req, res) => {
  try {
    await deleteDoc(doc(db, "contracts", req.params.id));
    res.json({ success: true, deletedId: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ errorAr: "فشل حذف العقد", errorEn: "Failed to delete contract" });
  }
});

app.get("/api/settings", async (req, res) => {
  try {
    const snap = await getDoc(doc(db, "settings", "global"));
    res.json(snap.exists() ? snap.data() : DEFAULT_SETTINGS);
  } catch(e) {
    res.json(readSettings());
  }
});

app.put("/api/settings", async (req, res) => {
  try {
    const snap = await getDoc(doc(db, "settings", "global"));
    const currentSettings = snap.exists() ? snap.data() : DEFAULT_SETTINGS;
    const updated = { ...currentSettings, ...req.body };
    await setDoc(doc(db, "settings", "global"), updated);
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ errorAr: "فشل التحديث", errorEn: "Update failed" });
  }
});

app.get("/api/quotations", async (req, res) => {
  try {
    const snap = await getDocs(collection(db, "quotations"));
    let results = snap.docs.map(d => d.data() as Quotation).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (results.length === 0) {
      // Check if seeding was already performed in the past
      const seedDoc = await getDoc(doc(db, "settings", "seedStatus"));
      if (!seedDoc.exists() || !seedDoc.data()?.quotationsSeeded) {
        // Seed with some dummy data if empty for demonstrative luxurious look
        const demoQuotations: Quotation[] = [
          {
            id: "1",
            code: "QT-2023-001",
            date: new Date().toISOString().split("T")[0],
            requestedBy: "أحمد علي",
            status: "Approved",
            approvalDetails: "Approved by Finance Dept.",
            attachmentsCount: 1,
            attachments: [
              {
                name: "report_draft.pdf",
                type: "application/pdf",
                dataUrl: "data:application/pdf;base64,JVBERi0xLjQK"
              }
            ],
            totalAmount: 15400
          },
          {
            id: "2",
            code: "QT-2023-002",
            date: new Date().toISOString().split("T")[0],
            requestedBy: "سارة حسن",
            status: "Pending",
            approvalDetails: "Waiting for CEO signature",
            attachmentsCount: 0,
            attachments: [],
            totalAmount: 4200
          }
        ];
        for (const q of demoQuotations) {
          await setDoc(doc(db, "quotations", q.id), q);
        }
        // Save seed record so we never reseed if empty in the future
        await setDoc(doc(db, "settings", "seedStatus"), { quotationsSeeded: true }, { merge: true });
        results = demoQuotations;
      }
    }
    res.json(results);
  } catch (err) {
    res.json(readQuotations());
  }
});

app.post("/api/quotations", async (req, res) => {
  try {
    const newQuote: Quotation = {
      id: req.body.id || Date.now().toString(),
      code: req.body.code,
      date: req.body.date || new Date().toISOString().split("T")[0],
      requestedBy: req.body.requestedBy || "غير محدد",
      status: req.body.status || "Pending",
      approvalDetails: req.body.approvalDetails || "",
      attachmentsCount: req.body.attachmentsCount || 0,
      attachments: req.body.attachments || [],
      totalAmount: Number(req.body.totalAmount) || 0,
      createdAt: new Date().toISOString(),
      nextInvoiceDate: req.body.nextInvoiceDate || ""
    };
    await setDoc(doc(db, "quotations", newQuote.id), newQuote);
    res.status(201).json(newQuote);
  } catch (err) {
    console.error(err);
    res.status(500).json({ errorAr: "فشل إضافة عرض السعر", errorEn: "Failed to add quotation" });
  }
});

app.put("/api/quotations/:id", async (req, res) => {
  try {
    const snap = await getDoc(doc(db, "quotations", req.params.id));
    if (!snap.exists()) return res.status(404).json({ errorAr: "عرض السعر غير موجود", errorEn: "Quotation not found" });
    const oldQuote = snap.data() as Quotation;
    const updatedQuote = { ...oldQuote, ...req.body };
    await setDoc(doc(db, "quotations", updatedQuote.id), updatedQuote);
    res.json(updatedQuote);
  } catch (err) {
    console.error(err);
    res.status(500).json({ errorAr: "فشل تحديث عرض السعر", errorEn: "Failed to update quotation" });
  }
});

app.delete("/api/quotations/:id", async (req, res) => {
  try {
    await deleteDoc(doc(db, "quotations", req.params.id));
    res.json({ success: true, deletedId: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ errorAr: "فشل حذف عرض السعر", errorEn: "Failed to delete quotation" });
  }
});

app.get("/api/employees", async (req, res) => {
  try {
    const snap = await getDocs(collection(db, "employees"));
    let results = snap.docs.map(d => d.data() as Employee).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (results.length === 0) {
      // Check if seeding was already performed in the past
      const seedDoc = await getDoc(doc(db, "settings", "seedStatus"));
      if (!seedDoc.exists() || !seedDoc.data()?.employeesSeeded) {
        const demoEmployees: Employee[] = [
          {
            id: "emp-1",
            name: "أحمد منصور",
            role: "مهندس أنظمة ميدانية",
            joinDate: "2024-01-15",
            phoneNumber: "0501234567",
            email: "a.mansour@itqan.co",
            createdAt: new Date().toISOString(),
            documents: [
              {
                id: "doc-1-1",
                name: "الإقامة / الهوية الوطنية",
                nameEn: "Residence ID / National ID",
                docNumber: "2441092837",
                expiryDate: "2027-05-20",
                fileName: "national_id.pdf",
                dataUrl: "data:application/pdf;base64,JVBERi0xLjQK"
              },
              {
                id: "doc-1-2",
                name: "رخصة القيادة الكلية",
                nameEn: "Driver's License",
                docNumber: "DL-93822",
                expiryDate: "2026-07-15", // Next month relative to June 2026!
                fileName: "driving_license.pdf",
                dataUrl: "data:application/pdf;base64,JVBERi0xLjQK"
              }
            ]
          },
          {
            id: "emp-2",
            name: "سليمان الفهد",
            role: "فني تكييف وتبريد أول",
            joinDate: "2024-03-10",
            phoneNumber: "0559876543",
            email: "s.alfahed@itqan.co",
            createdAt: new Date().toISOString(),
            documents: [
              {
                id: "doc-2-1",
                name: "رخصة العمل البلدية",
                nameEn: "Municipality Work License",
                docNumber: "MC-772911",
                expiryDate: "2026-07-28", // Next month relative to June 2026!
                fileName: "work_permit.pdf",
                dataUrl: "data:application/pdf;base64,JVBERi0xLjQK"
              },
              {
                id: "doc-2-2",
                name: "شهادة السلامة الميدانية",
                nameEn: "Field Safety Certification",
                docNumber: "SFT-88192",
                expiryDate: "2027-12-01",
                fileName: "safety_cert.pdf",
                dataUrl: "data:application/pdf;base64,JVBERi0xLjQK"
              }
            ]
          }
        ];
        for (const emp of demoEmployees) {
          await setDoc(doc(db, "employees", emp.id), emp);
        }
        // Save seed record so we never reseed if empty in the future
        await setDoc(doc(db, "settings", "seedStatus"), { employeesSeeded: true }, { merge: true });
        results = demoEmployees;
      }
    }
    res.json(results);
  } catch (err) {
    res.json(readEmployees());
  }
});

app.post("/api/employees", async (req, res) => {
  try {
    const newEmp: Employee = {
      id: req.body.id || "emp-" + Date.now().toString(),
      name: req.body.name,
      role: req.body.role || "موظف",
      joinDate: req.body.joinDate || new Date().toISOString().split("T")[0],
      phoneNumber: req.body.phoneNumber || "",
      email: req.body.email || "",
      documents: req.body.documents || [],
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, "employees", newEmp.id), newEmp);
    res.status(201).json(newEmp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ errorAr: "فشل إضافة الموظف", errorEn: "Failed to add employee" });
  }
});

app.put("/api/employees/:id", async (req, res) => {
  try {
    const snap = await getDoc(doc(db, "employees", req.params.id));
    if (!snap.exists()) return res.status(404).json({ errorAr: "الموظف غير موجود", errorEn: "Employee not found" });
    const oldEmp = snap.data() as Employee;
    const updatedEmp = { ...oldEmp, ...req.body };
    await setDoc(doc(db, "employees", updatedEmp.id), updatedEmp);
    res.json(updatedEmp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ errorAr: "فشل تحديث الموظف", errorEn: "Failed to update employee" });
  }
});

app.delete("/api/employees/:id", async (req, res) => {
  try {
    await deleteDoc(doc(db, "employees", req.params.id));
    res.json({ success: true, deletedId: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ errorAr: "فشل حذف الموظف", errorEn: "Failed to delete employee" });
  }
});

async function runServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Under Vercel, we do not want to listen on a local port. Instead, Vercel will handle the Express app instance directly.
  if (!process.env.VERCEL) {
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`[ITQAN FSM ENGINE] Central Database Core equipped with Distributed Firestore Cloud on port ${PORT}`);
    });
  }
}

// Only run the server standalone if we are not in a Vercel Serverless environment
if (!process.env.VERCEL) {
  runServer();
}

export default app;
