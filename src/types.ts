export interface TicketUpdate {
  timestamp: string;
  message: string;
  author: string;
}

export interface FieldReport {
  completionNotes: string;
  beforeImage: string | null; // base64 string
  afterImage: string | null;  // base64 string
  signature: string | null;   // svg outline or base64 sign
  reportTimestamp: string | null;
  gps: { latitude: number; longitude: number } | null;
}

export interface Ticket {
  id: string;
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  category: "HVAC" | "Electrical" | "Plumbing" | "General";
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Pending" | "Assigned" | "In Progress" | "In QA Review" | "Closed";
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

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface SystemSettings {
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

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  actionAr: string;
  actionEn: string;
  category: "ticket" | "dispatch" | "field" | "settings" | "auth" | "system";
}

export interface NotificationItem {
  id: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Contract {
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

export interface EmployeeDocument {
  id: string;
  name: string;        // Name or Type in Arabic: "إقامة", "رخصة العمل", "رخصة القيادة", etc.
  nameEn: string;      // Name or Type in English
  docNumber: string;   // License / doc number
  expiryDate: string;  // Expiry date (YYYY-MM-DD)
  dataUrl?: string;    // Base64 file string (for uploading documents like ID photocopy, license, etc)
  fileName?: string;   // Name of uploaded file
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  joinDate: string;
  phoneNumber?: string;
  email?: string;
  documents: EmployeeDocument[];
  createdAt: string;
}


