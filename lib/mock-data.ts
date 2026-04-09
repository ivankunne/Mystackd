export type IncomeSource = "stripe" | "paypal" | "upwork" | "fiverr" | "manual";
export type IncomeStatus = "settled" | "pending" | "refunded";
export type ConnectionStatus = "connected" | "disconnected";
export type Currency = "EUR" | "USD" | "GBP" | "NOK";

export interface IncomeEntry {
  id: string;
  userId: string;
  source: IncomeSource;
  amount: number;
  currency: Currency;
  date: string; // ISO date string
  note: string;
  status: IncomeStatus;
  externalId?: string;
  createdAt: string;
  clientId?: string;
  clientName?: string;
  projectName?: string;
  isRecurring?: boolean;
  recurringId?: string;
  invoiceId?: string;
  amountInHomeCurrency?: number;
  fxRate?: number;
}

export interface Connection {
  source: IncomeSource;
  status: ConnectionStatus;
  connectedAt: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  currency: Currency;
  country: string;
  monthlyExpenses: {
    rent: number;
    subscriptions: number;
    other: number;
  };
  taxBracket: number;
  isPro: boolean;
  emailVerified?: boolean;
  incomeGoal?: number;
  referralCode?: string;
  publicPageEnabled?: boolean;
  publicPageSlug?: string;
  phone?: string;
  website?: string;
  bio?: string;
  language?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  userId: string;
  clientId?: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  items: InvoiceItem[];
  currency: Currency;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  status: "draft" | "sent" | "paid" | "overdue";
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  linkedIncomeEntryId?: string;
  notes?: string;
  createdAt: string;
  isRecurring?: boolean;
  recurringFrequency?: "monthly" | "quarterly" | "annually";
  recurringNextDate?: string;
  recurringParentId?: string;
}

export interface Client {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  country?: string;
  notes?: string;
  createdAt: string;
}

export interface TaxReminder {
  id: string;
  quarter: number;
  year: number;
  dueDate: string;
  estimatedAmount: number;
  currency: Currency;
  isPaid: boolean;
  country: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

export const MOCK_USER: User = {
  id: "user_mock_001",
  name: "Ivan de Vries",
  email: "ivan@frameflow.no",
  currency: "EUR",
  country: "NO",
  monthlyExpenses: { rent: 1500, subscriptions: 200, other: 100 },
  taxBracket: 0.33,
  isPro: false,
  emailVerified: true,
  incomeGoal: 60000,
  publicPageEnabled: true,
  publicPageSlug: "ivan",
};

export const MOCK_CONNECTIONS: Connection[] = [
  { source: "stripe", status: "connected", connectedAt: "2024-01-15" },
  { source: "paypal", status: "connected", connectedAt: "2024-02-01" },
  { source: "upwork", status: "disconnected", connectedAt: null },
  { source: "fiverr", status: "connected", connectedAt: "2024-03-10" },
  { source: "manual", status: "connected", connectedAt: "2024-01-01" },
];

export const MOCK_CLIENTS: Client[] = [
  {
    id: "client_001",
    userId: "user_mock_001",
    name: "Acme Corp",
    email: "acme@acmecorp.com",
    company: "Acme Corp",
    country: "NL",
    notes: "Long-term client, quarterly website projects",
    createdAt: "2024-09-01T00:00:00Z",
  },
  {
    id: "client_002",
    userId: "user_mock_001",
    name: "NordMedia AS",
    email: "contact@nordmedia.no",
    company: "NordMedia AS",
    country: "NO",
    notes: "Monthly retainer client — design & strategy",
    createdAt: "2024-09-15T00:00:00Z",
  },
  {
    id: "client_003",
    userId: "user_mock_001",
    name: "Fjord Ventures",
    email: "hello@fjordventures.no",
    company: "Fjord Ventures",
    country: "NO",
    notes: "Startup — brand identity and marketing materials",
    createdAt: "2024-10-01T00:00:00Z",
  },
  {
    id: "client_004",
    userId: "user_mock_001",
    name: "Pulse Health",
    email: "ivan@pulsehealth.io",
    company: "Pulse Health Inc.",
    country: "US",
    notes: "Mobile app UI — USD invoicing",
    createdAt: "2024-12-01T00:00:00Z",
  },
  {
    id: "client_005",
    userId: "user_mock_001",
    name: "Kite Analytics",
    email: "finance@kiteanalytics.com",
    company: "Kite Analytics Ltd.",
    country: "GB",
    notes: "SaaS dashboard redesign project",
    createdAt: "2025-01-10T00:00:00Z",
  },
];

export const MOCK_INVOICES: Invoice[] = [
  {
    id: "inv_001",
    userId: "user_mock_001",
    invoiceNumber: "INV-2024-001",
    clientName: "Acme Corp",
    clientEmail: "acme@acmecorp.com",
    clientAddress: "Keizersgracht 123, Amsterdam, Netherlands",
    items: [
      { description: "Website redesign — design & development", quantity: 1, unitPrice: 3200, total: 3200 },
    ],
    currency: "EUR",
    subtotal: 3200,
    taxRate: 0,
    taxAmount: 0,
    total: 3200,
    status: "paid",
    issueDate: "2024-10-01",
    dueDate: "2024-10-31",
    linkedIncomeEntryId: "inc_001",
    notes: "Thank you for your business!",
    createdAt: "2024-10-01T09:00:00Z",
  },
  {
    id: "inv_002",
    userId: "user_mock_001",
    invoiceNumber: "INV-2024-002",
    clientName: "Fjord Ventures",
    clientEmail: "hello@fjordventures.no",
    clientAddress: "Storgata 45, Oslo, Norway",
    items: [
      { description: "Brand identity — logo & visual system", quantity: 1, unitPrice: 3500, total: 3500 },
      { description: "Brand guidelines document", quantity: 1, unitPrice: 2000, total: 2000 },
    ],
    currency: "EUR",
    subtotal: 5500,
    taxRate: 0.25,
    taxAmount: 1375,
    total: 6875,
    status: "paid",
    issueDate: "2024-11-05",
    dueDate: "2024-12-05",
    linkedIncomeEntryId: "inc_008",
    notes: "MVA included per Norwegian tax law.",
    createdAt: "2024-11-05T10:00:00Z",
  },
  {
    id: "inv_003",
    userId: "user_mock_001",
    invoiceNumber: "INV-2024-003",
    clientName: "Pulse Health",
    clientEmail: "ivan@pulsehealth.io",
    clientAddress: "548 Market St, San Francisco, CA 94104, USA",
    items: [
      { description: "Mobile app UI design — iOS & Android", quantity: 1, unitPrice: 4565, total: 4565 },
    ],
    currency: "USD",
    subtotal: 4565,
    taxRate: 0,
    taxAmount: 0,
    total: 4565,
    status: "paid",
    issueDate: "2025-01-03",
    dueDate: "2025-02-03",
    linkedIncomeEntryId: "inc_015",
    notes: "Payment in USD. Exchange rate applied at time of receipt.",
    createdAt: "2025-01-03T09:00:00Z",
  },
  {
    id: "inv_004",
    userId: "user_mock_001",
    invoiceNumber: "INV-2025-001",
    clientName: "Kite Analytics",
    clientEmail: "finance@kiteanalytics.com",
    clientAddress: "12 Finsbury Square, London EC2A 1AR, UK",
    items: [
      { description: "SaaS dashboard redesign — UX research", quantity: 1, unitPrice: 1200, total: 1200 },
      { description: "SaaS dashboard redesign — UI design", quantity: 1, unitPrice: 2400, total: 2400 },
    ],
    currency: "EUR",
    subtotal: 3600,
    taxRate: 0,
    taxAmount: 0,
    total: 3600,
    status: "sent",
    issueDate: "2025-02-01",
    dueDate: "2025-03-01",
    linkedIncomeEntryId: "inc_019",
    notes: "Net 30 payment terms.",
    createdAt: "2025-02-01T11:00:00Z",
  },
  {
    id: "inv_005",
    userId: "user_mock_001",
    invoiceNumber: "INV-2025-002",
    clientName: "Acme Corp",
    clientEmail: "acme@acmecorp.com",
    clientAddress: "Keizersgracht 123, Amsterdam, Netherlands",
    items: [
      { description: "Q1 2025 — website maintenance & updates", quantity: 3, unitPrice: 400, total: 1200 },
      { description: "SEO audit and recommendations", quantity: 1, unitPrice: 600, total: 600 },
    ],
    currency: "EUR",
    subtotal: 1800,
    taxRate: 0,
    taxAmount: 0,
    total: 1800,
    status: "overdue",
    issueDate: "2025-02-15",
    dueDate: "2025-03-15",
    notes: "Payment overdue — please remit at your earliest convenience.",
    createdAt: "2025-02-15T10:00:00Z",
  },
  {
    id: "inv_006",
    userId: "user_mock_001",
    invoiceNumber: "INV-2025-003",
    clientName: "Fjord Ventures",
    clientEmail: "hello@fjordventures.no",
    clientAddress: "Storgata 45, Oslo, Norway",
    items: [
      { description: "Product design sprint — week 1", quantity: 40, unitPrice: 75, total: 3000 },
      { description: "Product design sprint — week 2", quantity: 40, unitPrice: 75, total: 3000 },
    ],
    currency: "EUR",
    subtotal: 6000,
    taxRate: 0.25,
    taxAmount: 1500,
    total: 7500,
    status: "draft",
    issueDate: "2025-03-03",
    dueDate: "2025-04-03",
    linkedIncomeEntryId: "inc_023",
    notes: "Draft — please review before sending.",
    createdAt: "2025-03-03T09:00:00Z",
  },
];

export const MOCK_INCOME_ENTRIES: IncomeEntry[] = [
  // October 2024
  {
    id: "inc_001",
    userId: "user_mock_001",
    source: "stripe",
    amount: 3200,
    currency: "EUR",
    date: "2024-10-03",
    note: "Website redesign — Acme Corp",
    status: "settled",
    externalId: "ch_3Oct001",
    createdAt: "2024-10-03T10:00:00Z",
    clientName: "Acme Corp",
    projectName: "Website Redesign Q4",
    invoiceId: "inv_001",
  },
  {
    id: "inc_002",
    userId: "user_mock_001",
    source: "fiverr",
    amount: 450,
    currency: "EUR",
    date: "2024-10-08",
    note: "Logo design package",
    status: "settled",
    externalId: "fvr_oct_001",
    createdAt: "2024-10-08T14:30:00Z",
  },
  {
    id: "inc_003",
    userId: "user_mock_001",
    source: "paypal",
    amount: 1800,
    currency: "EUR",
    date: "2024-10-15",
    note: "Monthly retainer — NordMedia AS",
    status: "settled",
    externalId: "pp_oct_001",
    createdAt: "2024-10-15T09:00:00Z",
    clientName: "NordMedia AS",
    projectName: "Monthly Design Retainer",
    isRecurring: true,
    recurringId: "rec_nordmedia_001",
  },
  {
    id: "inc_004",
    userId: "user_mock_001",
    source: "manual",
    amount: 600,
    currency: "EUR",
    date: "2024-10-22",
    note: "Photography session",
    status: "settled",
    createdAt: "2024-10-22T16:00:00Z",
  },
  {
    id: "inc_005",
    userId: "user_mock_001",
    source: "stripe",
    amount: 2100,
    currency: "EUR",
    date: "2024-10-28",
    note: "E-commerce build — Bergen Boutique",
    status: "settled",
    externalId: "ch_3Oct002",
    createdAt: "2024-10-28T11:00:00Z",
    projectName: "E-commerce Store",
  },

  // November 2024
  {
    id: "inc_006",
    userId: "user_mock_001",
    source: "paypal",
    amount: 1800,
    currency: "EUR",
    date: "2024-11-01",
    note: "Monthly retainer — NordMedia AS",
    status: "settled",
    externalId: "pp_nov_001",
    createdAt: "2024-11-01T09:00:00Z",
    clientName: "NordMedia AS",
    projectName: "Monthly Design Retainer",
    isRecurring: true,
    recurringId: "rec_nordmedia_001",
  },
  {
    id: "inc_007",
    userId: "user_mock_001",
    source: "fiverr",
    amount: 320,
    currency: "EUR",
    date: "2024-11-07",
    note: "Social media kit design",
    status: "settled",
    externalId: "fvr_nov_001",
    createdAt: "2024-11-07T13:00:00Z",
  },
  {
    id: "inc_008",
    userId: "user_mock_001",
    source: "stripe",
    amount: 5500,
    currency: "EUR",
    date: "2024-11-12",
    note: "Brand identity package — Fjord Ventures",
    status: "settled",
    externalId: "ch_3Nov001",
    createdAt: "2024-11-12T10:30:00Z",
    clientName: "Fjord Ventures",
    projectName: "Brand Identity Package",
    invoiceId: "inv_002",
  },
  {
    id: "inc_009",
    userId: "user_mock_001",
    source: "manual",
    amount: 250,
    currency: "EUR",
    date: "2024-11-19",
    note: "Workshop facilitation",
    status: "settled",
    createdAt: "2024-11-19T17:00:00Z",
  },
  {
    id: "inc_010",
    userId: "user_mock_001",
    source: "fiverr",
    amount: 680,
    currency: "EUR",
    date: "2024-11-25",
    note: "UX audit report",
    status: "settled",
    externalId: "fvr_nov_002",
    createdAt: "2024-11-25T12:00:00Z",
  },

  // December 2024
  {
    id: "inc_011",
    userId: "user_mock_001",
    source: "stripe",
    amount: 8000,
    currency: "EUR",
    date: "2024-12-02",
    note: "Annual website maintenance contract — Hallvard & Co",
    status: "settled",
    externalId: "ch_3Dec001",
    createdAt: "2024-12-02T09:00:00Z",
    projectName: "Annual Maintenance Contract",
  },
  {
    id: "inc_012",
    userId: "user_mock_001",
    source: "paypal",
    amount: 1800,
    currency: "EUR",
    date: "2024-12-01",
    note: "Monthly retainer — NordMedia AS",
    status: "settled",
    externalId: "pp_dec_001",
    createdAt: "2024-12-01T09:00:00Z",
    clientName: "NordMedia AS",
    projectName: "Monthly Design Retainer",
    isRecurring: true,
    recurringId: "rec_nordmedia_001",
  },
  {
    id: "inc_013",
    userId: "user_mock_001",
    source: "fiverr",
    amount: 200,
    currency: "EUR",
    date: "2024-12-10",
    note: "Icon set design",
    status: "settled",
    externalId: "fvr_dec_001",
    createdAt: "2024-12-10T14:00:00Z",
  },
  {
    id: "inc_014",
    userId: "user_mock_001",
    source: "manual",
    amount: 900,
    currency: "EUR",
    date: "2024-12-18",
    note: "Year-end consulting — Skjold Invest",
    status: "settled",
    createdAt: "2024-12-18T10:00:00Z",
    projectName: "Year-end Consulting",
  },

  // January 2025
  {
    id: "inc_015",
    userId: "user_mock_001",
    source: "stripe",
    amount: 4200,
    currency: "USD",
    date: "2025-01-06",
    note: "Mobile app UI design — Pulse Health",
    status: "settled",
    externalId: "ch_3Jan001",
    createdAt: "2025-01-06T10:00:00Z",
    clientName: "Pulse Health",
    projectName: "Mobile App UI",
    fxRate: 0.920,
    amountInHomeCurrency: 3864,
    invoiceId: "inv_003",
  },
  {
    id: "inc_016",
    userId: "user_mock_001",
    source: "paypal",
    amount: 1800,
    currency: "EUR",
    date: "2025-01-01",
    note: "Monthly retainer — NordMedia AS",
    status: "settled",
    externalId: "pp_jan_001",
    createdAt: "2025-01-01T09:00:00Z",
    clientName: "NordMedia AS",
    projectName: "Monthly Design Retainer",
    isRecurring: true,
    recurringId: "rec_nordmedia_001",
  },
  {
    id: "inc_017",
    userId: "user_mock_001",
    source: "fiverr",
    amount: 540,
    currency: "EUR",
    date: "2025-01-14",
    note: "Presentation deck design",
    status: "settled",
    externalId: "fvr_jan_001",
    createdAt: "2025-01-14T13:00:00Z",
    projectName: "Presentation Deck",
  },
  {
    id: "inc_018",
    userId: "user_mock_001",
    source: "manual",
    amount: 350,
    currency: "EUR",
    date: "2025-01-20",
    note: "Photography editing batch",
    status: "settled",
    createdAt: "2025-01-20T16:00:00Z",
  },

  // February 2025
  {
    id: "inc_019",
    userId: "user_mock_001",
    source: "stripe",
    amount: 3600,
    currency: "EUR",
    date: "2025-02-04",
    note: "SaaS dashboard redesign — Kite Analytics",
    status: "settled",
    externalId: "ch_3Feb001",
    createdAt: "2025-02-04T11:00:00Z",
    clientName: "Kite Analytics",
    projectName: "SaaS Dashboard Redesign",
    invoiceId: "inv_004",
  },
  {
    id: "inc_020",
    userId: "user_mock_001",
    source: "paypal",
    amount: 1800,
    currency: "EUR",
    date: "2025-02-01",
    note: "Monthly retainer — NordMedia AS",
    status: "settled",
    externalId: "pp_feb_001",
    createdAt: "2025-02-01T09:00:00Z",
    clientName: "NordMedia AS",
    projectName: "Monthly Design Retainer",
    isRecurring: true,
    recurringId: "rec_nordmedia_001",
  },
  {
    id: "inc_021",
    userId: "user_mock_001",
    source: "fiverr",
    amount: 410,
    currency: "EUR",
    date: "2025-02-12",
    note: "Brand guide document",
    status: "settled",
    externalId: "fvr_feb_001",
    createdAt: "2025-02-12T14:00:00Z",
    projectName: "Brand Guide",
  },
  {
    id: "inc_022",
    userId: "user_mock_001",
    source: "stripe",
    amount: 3200,
    currency: "USD",
    date: "2025-02-21",
    note: "Landing page design + dev — Solstice Labs",
    status: "settled",
    externalId: "ch_3Feb002",
    createdAt: "2025-02-21T10:00:00Z",
    projectName: "Landing Page Design",
    fxRate: 0.920,
    amountInHomeCurrency: 2944,
  },

  // March 2025
  {
    id: "inc_023",
    userId: "user_mock_001",
    source: "stripe",
    amount: 5200,
    currency: "EUR",
    date: "2025-03-03",
    note: "Product design sprint — Arctos Studio",
    status: "settled",
    externalId: "ch_3Mar001",
    createdAt: "2025-03-03T09:30:00Z",
    clientName: "Fjord Ventures",
    projectName: "Product Design Sprint",
    invoiceId: "inv_006",
  },
  {
    id: "inc_024",
    userId: "user_mock_001",
    source: "paypal",
    amount: 1800,
    currency: "EUR",
    date: "2025-03-01",
    note: "Monthly retainer — NordMedia AS",
    status: "settled",
    externalId: "pp_mar_001",
    createdAt: "2025-03-01T09:00:00Z",
    clientName: "NordMedia AS",
    projectName: "Monthly Design Retainer",
    isRecurring: true,
    recurringId: "rec_nordmedia_001",
  },
  {
    id: "inc_025",
    userId: "user_mock_001",
    source: "manual",
    amount: 750,
    currency: "EUR",
    date: "2025-03-15",
    note: "Video editing — Fjord Films",
    status: "settled",
    createdAt: "2025-03-15T15:00:00Z",
    projectName: "Video Editing",
  },
];


export const MOCK_TAX_REMINDERS: TaxReminder[] = [
  {
    id: "tax_2025_q1",
    quarter: 1,
    year: 2025,
    dueDate: "2025-03-31",
    estimatedAmount: 2100,
    currency: "EUR",
    isPaid: false,
    country: "NO",
  },
  {
    id: "tax_2025_q2",
    quarter: 2,
    year: 2025,
    dueDate: "2025-05-31",
    estimatedAmount: 2400,
    currency: "EUR",
    isPaid: false,
    country: "NO",
  },
  {
    id: "tax_2025_q3",
    quarter: 3,
    year: 2025,
    dueDate: "2025-09-30",
    estimatedAmount: 2200,
    currency: "EUR",
    isPaid: false,
    country: "NO",
  },
  {
    id: "tax_2025_q4",
    quarter: 4,
    year: 2025,
    dueDate: "2025-11-30",
    estimatedAmount: 2300,
    currency: "EUR",
    isPaid: false,
    country: "NO",
  },
];

export const MOCK_WEBHOOKS: Webhook[] = [
  {
    id: "wh_001",
    url: "https://my-app.example.com/webhooks/mystackd",
    events: ["income.created", "invoice.paid"],
    isActive: true,
    createdAt: "2025-02-01T12:00:00Z",
  },
];

// ─── Payment Reminders ────────────────────────────────────────────────────────

export type ReminderChannel = "copied" | "email" | "manual";

export interface ReminderLog {
  id: string;
  userId: string;
  invoiceId: string;
  sentAt: string; // ISO timestamp
  channel: ReminderChannel;
  note?: string; // e.g. "Sent via Gmail"
}

export const MOCK_REMINDER_LOGS: ReminderLog[] = [
  {
    id: "rem_001",
    userId: "user_mock_001",
    invoiceId: "inv_005", // Acme Corp — overdue
    sentAt: "2025-03-20T09:15:00Z",
    channel: "copied",
    note: "Copied reminder email, sent via Gmail",
  },
  {
    id: "rem_002",
    userId: "user_mock_001",
    invoiceId: "inv_005", // Acme Corp — overdue, second chase
    sentAt: "2025-03-27T10:30:00Z",
    channel: "copied",
    note: "Second follow-up",
  },
  {
    id: "rem_003",
    userId: "user_mock_001",
    invoiceId: "inv_004", // Kite Analytics — sent, not yet overdue
    sentAt: "2025-03-10T14:00:00Z",
    channel: "copied",
  },
];

// ─── Time Tracking ────────────────────────────────────────────────────────────

export interface TimeEntry {
  id: string;
  userId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  clientName: string;
  projectName?: string;
  description: string;
  durationMinutes: number;
  hourlyRate: number;
  currency: Currency;
  isBilled: boolean;
  invoiceId?: string;
  createdAt: string;
}

export const MOCK_TIME_ENTRIES: TimeEntry[] = [
  // January 2025
  {
    id: "te_001",
    userId: "user_mock_001",
    date: "2025-01-06",
    clientName: "Pulse Health",
    projectName: "Mobile App UI",
    description: "iOS onboarding flow — wireframes & layout",
    durationMinutes: 180,
    hourlyRate: 95,
    currency: "USD",
    isBilled: true,
    invoiceId: "inv_003",
    createdAt: "2025-01-06T10:00:00Z",
  },
  {
    id: "te_002",
    userId: "user_mock_001",
    date: "2025-01-07",
    clientName: "Pulse Health",
    projectName: "Mobile App UI",
    description: "Dashboard screen designs — hi-fi",
    durationMinutes: 240,
    hourlyRate: 95,
    currency: "USD",
    isBilled: true,
    invoiceId: "inv_003",
    createdAt: "2025-01-07T09:00:00Z",
  },
  {
    id: "te_003",
    userId: "user_mock_001",
    date: "2025-01-14",
    clientName: "NordMedia AS",
    projectName: "Monthly Design Retainer",
    description: "Social media template updates",
    durationMinutes: 120,
    hourlyRate: 90,
    currency: "EUR",
    isBilled: true,
    invoiceId: undefined,
    createdAt: "2025-01-14T13:00:00Z",
  },
  // February 2025
  {
    id: "te_004",
    userId: "user_mock_001",
    date: "2025-02-04",
    clientName: "Kite Analytics",
    projectName: "SaaS Dashboard Redesign",
    description: "UX research — competitor audit & user flows",
    durationMinutes: 210,
    hourlyRate: 85,
    currency: "EUR",
    isBilled: true,
    invoiceId: "inv_004",
    createdAt: "2025-02-04T10:00:00Z",
  },
  {
    id: "te_005",
    userId: "user_mock_001",
    date: "2025-02-06",
    clientName: "Kite Analytics",
    projectName: "SaaS Dashboard Redesign",
    description: "UI design — chart components & data tables",
    durationMinutes: 300,
    hourlyRate: 85,
    currency: "EUR",
    isBilled: true,
    invoiceId: "inv_004",
    createdAt: "2025-02-06T09:30:00Z",
  },
  {
    id: "te_006",
    userId: "user_mock_001",
    date: "2025-02-13",
    clientName: "NordMedia AS",
    projectName: "Monthly Design Retainer",
    description: "Brand refresh — colour palette exploration",
    durationMinutes: 150,
    hourlyRate: 90,
    currency: "EUR",
    isBilled: true,
    invoiceId: undefined,
    createdAt: "2025-02-13T11:00:00Z",
  },
  // March 2025 — unbilled (current month)
  {
    id: "te_007",
    userId: "user_mock_001",
    date: "2025-03-03",
    clientName: "Fjord Ventures",
    projectName: "Product Design Sprint",
    description: "Sprint kickoff — problem framing & journey mapping",
    durationMinutes: 240,
    hourlyRate: 100,
    currency: "EUR",
    isBilled: false,
    createdAt: "2025-03-03T09:00:00Z",
  },
  {
    id: "te_008",
    userId: "user_mock_001",
    date: "2025-03-05",
    clientName: "Fjord Ventures",
    projectName: "Product Design Sprint",
    description: "Ideation workshop — sketching & concept selection",
    durationMinutes: 180,
    hourlyRate: 100,
    currency: "EUR",
    isBilled: false,
    createdAt: "2025-03-05T10:00:00Z",
  },
  {
    id: "te_009",
    userId: "user_mock_001",
    date: "2025-03-10",
    clientName: "Acme Corp",
    projectName: "Website Redesign Q1",
    description: "Homepage redesign — component library setup",
    durationMinutes: 210,
    hourlyRate: 90,
    currency: "EUR",
    isBilled: false,
    createdAt: "2025-03-10T09:30:00Z",
  },
  {
    id: "te_010",
    userId: "user_mock_001",
    date: "2025-03-12",
    clientName: "Acme Corp",
    projectName: "Website Redesign Q1",
    description: "Homepage — hero section & navigation",
    durationMinutes: 150,
    hourlyRate: 90,
    currency: "EUR",
    isBilled: false,
    createdAt: "2025-03-12T14:00:00Z",
  },
  {
    id: "te_011",
    userId: "user_mock_001",
    date: "2025-03-17",
    clientName: "NordMedia AS",
    projectName: "Monthly Design Retainer",
    description: "March deliverables — landing page concept",
    durationMinutes: 120,
    hourlyRate: 90,
    currency: "EUR",
    isBilled: false,
    createdAt: "2025-03-17T10:00:00Z",
  },
  {
    id: "te_012",
    userId: "user_mock_001",
    date: "2025-03-20",
    clientName: "Fjord Ventures",
    projectName: "Product Design Sprint",
    description: "Prototype — interactive Figma flows",
    durationMinutes: 270,
    hourlyRate: 100,
    currency: "EUR",
    isBilled: false,
    createdAt: "2025-03-20T09:00:00Z",
  },
  {
    id: "te_013",
    userId: "user_mock_001",
    date: "2025-03-25",
    clientName: "Acme Corp",
    projectName: "Website Redesign Q1",
    description: "Inner pages — about, services, contact",
    durationMinutes: 240,
    hourlyRate: 90,
    currency: "EUR",
    isBilled: false,
    createdAt: "2025-03-25T09:00:00Z",
  },
];

// ─── Expenses ─────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | "software"
  | "hardware"
  | "travel"
  | "coworking"
  | "marketing"
  | "education"
  | "fees"
  | "other";

export interface Expense {
  id: string;
  userId: string;
  date: string; // ISO date string
  amount: number;
  currency: Currency;
  category: ExpenseCategory;
  description: string;
  vendor?: string;
  isTaxDeductible: boolean;
  isRecurring?: boolean;
  recurringId?: string;
  createdAt: string;
}

export const MOCK_EXPENSES: Expense[] = [
  // January 2025
  {
    id: "exp_001",
    userId: "user_mock_001",
    date: "2025-01-02",
    amount: 49,
    currency: "EUR",
    category: "software",
    description: "Figma Professional",
    vendor: "Figma",
    isTaxDeductible: true,
    createdAt: "2025-01-02T08:00:00Z",
  },
  {
    id: "exp_002",
    userId: "user_mock_001",
    date: "2025-01-02",
    amount: 20,
    currency: "EUR",
    category: "software",
    description: "Adobe CC monthly",
    vendor: "Adobe",
    isTaxDeductible: true,
    createdAt: "2025-01-02T08:10:00Z",
  },
  {
    id: "exp_003",
    userId: "user_mock_001",
    date: "2025-01-10",
    amount: 350,
    currency: "EUR",
    category: "coworking",
    description: "Coworking desk — January",
    vendor: "Spaces Oslo",
    isTaxDeductible: true,
    createdAt: "2025-01-10T09:00:00Z",
  },
  {
    id: "exp_004",
    userId: "user_mock_001",
    date: "2025-01-18",
    amount: 89,
    currency: "EUR",
    category: "travel",
    description: "Train to client meeting",
    vendor: "VY Group",
    isTaxDeductible: true,
    createdAt: "2025-01-18T14:00:00Z",
  },
  // February 2025
  {
    id: "exp_005",
    userId: "user_mock_001",
    date: "2025-02-02",
    amount: 49,
    currency: "EUR",
    category: "software",
    description: "Figma Professional",
    vendor: "Figma",
    isTaxDeductible: true,
    createdAt: "2025-02-02T08:00:00Z",
  },
  {
    id: "exp_006",
    userId: "user_mock_001",
    date: "2025-02-02",
    amount: 20,
    currency: "EUR",
    category: "software",
    description: "Adobe CC monthly",
    vendor: "Adobe",
    isTaxDeductible: true,
    createdAt: "2025-02-02T08:10:00Z",
  },
  {
    id: "exp_007",
    userId: "user_mock_001",
    date: "2025-02-10",
    amount: 350,
    currency: "EUR",
    category: "coworking",
    description: "Coworking desk — February",
    vendor: "Spaces Oslo",
    isTaxDeductible: true,
    createdAt: "2025-02-10T09:00:00Z",
  },
  {
    id: "exp_008",
    userId: "user_mock_001",
    date: "2025-02-14",
    amount: 129,
    currency: "EUR",
    category: "education",
    description: "UX design course",
    vendor: "Interaction Design Foundation",
    isTaxDeductible: true,
    createdAt: "2025-02-14T10:00:00Z",
  },
  {
    id: "exp_009",
    userId: "user_mock_001",
    date: "2025-02-22",
    amount: 45,
    currency: "EUR",
    category: "fees",
    description: "Stripe transaction fees",
    vendor: "Stripe",
    isTaxDeductible: true,
    createdAt: "2025-02-22T11:00:00Z",
  },
  // March 2025
  {
    id: "exp_010",
    userId: "user_mock_001",
    date: "2025-03-02",
    amount: 49,
    currency: "EUR",
    category: "software",
    description: "Figma Professional",
    vendor: "Figma",
    isTaxDeductible: true,
    createdAt: "2025-03-02T08:00:00Z",
  },
  {
    id: "exp_011",
    userId: "user_mock_001",
    date: "2025-03-02",
    amount: 20,
    currency: "EUR",
    category: "software",
    description: "Adobe CC monthly",
    vendor: "Adobe",
    isTaxDeductible: true,
    createdAt: "2025-03-02T08:10:00Z",
  },
  {
    id: "exp_012",
    userId: "user_mock_001",
    date: "2025-03-10",
    amount: 350,
    currency: "EUR",
    category: "coworking",
    description: "Coworking desk — March",
    vendor: "Spaces Oslo",
    isTaxDeductible: true,
    createdAt: "2025-03-10T09:00:00Z",
  },
  {
    id: "exp_013",
    userId: "user_mock_001",
    date: "2025-03-05",
    amount: 240,
    currency: "EUR",
    category: "hardware",
    description: "Logitech MX Keys keyboard",
    vendor: "Logitech",
    isTaxDeductible: true,
    createdAt: "2025-03-05T12:00:00Z",
  },
  {
    id: "exp_014",
    userId: "user_mock_001",
    date: "2025-03-19",
    amount: 65,
    currency: "EUR",
    category: "marketing",
    description: "LinkedIn Premium subscription",
    vendor: "LinkedIn",
    isTaxDeductible: true,
    createdAt: "2025-03-19T09:30:00Z",
  },
  {
    id: "exp_015",
    userId: "user_mock_001",
    date: "2025-03-25",
    amount: 38,
    currency: "EUR",
    category: "fees",
    description: "PayPal transaction fees",
    vendor: "PayPal",
    isTaxDeductible: true,
    createdAt: "2025-03-25T10:00:00Z",
  },
];

// ─── Client Portal ────────────────────────────────────────────────────────────

export type PortalUpdateStatus = "on-track" | "review" | "completed" | "blocked";

export interface ProjectUpdate {
  id: string;
  clientId: string;
  userId: string;
  title: string;
  content: string;
  status: PortalUpdateStatus;
  createdAt: string;
}

export interface SharedFile {
  id: string;
  clientId: string;
  userId: string;
  name: string;
  type: "design" | "document" | "video" | "other";
  sizeLabel: string;
  uploadedAt: string;
  description?: string;
  storagePath?: string;
  storageUrl?: string;
}

export interface ClientFeedback {
  id: string;
  clientId: string;
  fileId?: string;
  authorName: string;
  content: string;
  submittedAt: string;
  isRead: boolean;
}

export interface ClientPortal {
  clientId: string;
  userId?: string;
  token: string;
  isEnabled: boolean;
  freelancerName: string;
  headerNote?: string;
  allowFeedback: boolean;
  showInvoices: boolean;
  showFiles: boolean;
  showUpdates: boolean;
}

export const MOCK_PROJECT_UPDATES: ProjectUpdate[] = [
  {
    id: "upd_001",
    clientId: "client_001",
    userId: "user_mock_001",
    title: "Homepage redesign — first draft ready for review",
    content: "I've completed the first draft of the homepage redesign. The main hero section and navigation are done. Please review the uploaded mockup files and share your thoughts on the direction before I proceed with the inner pages.",
    status: "review",
    createdAt: "2025-03-10T10:00:00Z",
  },
  {
    id: "upd_002",
    clientId: "client_001",
    userId: "user_mock_001",
    title: "Project kickoff — scope confirmed",
    content: "Great to connect! I've confirmed the project scope: homepage + 4 inner pages, mobile-responsive. Timeline: 3 weeks. First draft expected by March 10.",
    status: "on-track",
    createdAt: "2025-03-01T09:00:00Z",
  },
  {
    id: "upd_003",
    clientId: "client_002",
    userId: "user_mock_001",
    title: "March retainer — design assets delivered",
    content: "All March design deliverables are uploaded to the portal. This includes the updated social media templates and the new landing page concept. Let me know if you'd like any revisions.",
    status: "completed",
    createdAt: "2025-03-25T14:00:00Z",
  },
  {
    id: "upd_004",
    clientId: "client_002",
    userId: "user_mock_001",
    title: "Brand refresh — on track",
    content: "Work is progressing well on the brand refresh. Colour palette and typography are locked. I'll have the full guidelines document ready by end of month.",
    status: "on-track",
    createdAt: "2025-03-15T11:00:00Z",
  },
  {
    id: "upd_005",
    clientId: "client_004",
    userId: "user_mock_001",
    title: "iOS screens — waiting on API specs",
    content: "The Android screens are complete. iOS is blocked pending the final API specification document from your engineering team. Once that's received I can complete the remaining 8 screens.",
    status: "blocked",
    createdAt: "2025-03-20T09:30:00Z",
  },
];

export const MOCK_SHARED_FILES: SharedFile[] = [
  {
    id: "file_001",
    clientId: "client_001",
    userId: "user_mock_001",
    name: "Homepage_v1_Mockup.fig",
    type: "design",
    sizeLabel: "4.2 MB",
    uploadedAt: "2025-03-10T10:30:00Z",
    description: "Figma export — homepage first draft",
  },
  {
    id: "file_002",
    clientId: "client_001",
    userId: "user_mock_001",
    name: "Acme_Scope_Document.pdf",
    type: "document",
    sizeLabel: "312 KB",
    uploadedAt: "2025-03-01T09:00:00Z",
    description: "Agreed project scope and timeline",
  },
  {
    id: "file_003",
    clientId: "client_001",
    userId: "user_mock_001",
    name: "Navigation_Components.png",
    type: "design",
    sizeLabel: "1.8 MB",
    uploadedAt: "2025-03-12T15:00:00Z",
    description: "Navigation component explorations",
  },
  {
    id: "file_004",
    clientId: "client_002",
    userId: "user_mock_001",
    name: "March_Social_Templates.zip",
    type: "other",
    sizeLabel: "8.6 MB",
    uploadedAt: "2025-03-25T14:15:00Z",
    description: "Instagram + LinkedIn templates for March",
  },
  {
    id: "file_005",
    clientId: "client_002",
    userId: "user_mock_001",
    name: "NordMedia_BrandRefresh_v2.pdf",
    type: "document",
    sizeLabel: "2.1 MB",
    uploadedAt: "2025-03-18T10:00:00Z",
    description: "Brand guidelines draft v2",
  },
  {
    id: "file_006",
    clientId: "client_004",
    userId: "user_mock_001",
    name: "PulseHealth_Android_Screens.fig",
    type: "design",
    sizeLabel: "11.4 MB",
    uploadedAt: "2025-03-20T09:00:00Z",
    description: "All 22 Android screens — final",
  },
];

export const MOCK_FEEDBACK: ClientFeedback[] = [
  {
    id: "fb_001",
    clientId: "client_001",
    fileId: "file_001",
    authorName: "Sarah from Acme",
    content: "Love the direction! The hero section feels really clean. One thing — could we try a slightly warmer background tone? The team felt it was a bit cold. Also the CTA button colour is perfect.",
    submittedAt: "2025-03-11T14:22:00Z",
    isRead: true,
  },
  {
    id: "fb_002",
    clientId: "client_001",
    fileId: undefined,
    authorName: "Mark (Acme — CEO)",
    content: "Overall we're very happy with the progress. Timeline is good. Just make sure the mobile version works perfectly — we get 60% mobile traffic.",
    submittedAt: "2025-03-13T09:05:00Z",
    isRead: false,
  },
  {
    id: "fb_003",
    clientId: "client_002",
    fileId: "file_005",
    authorName: "Ingrid, NordMedia",
    content: "The v2 guidelines look great. Approved! Please proceed with the presentation template next.",
    submittedAt: "2025-03-19T16:40:00Z",
    isRead: true,
  },
];

// ─── Proposals ───────────────────────────────────────────────────────────────

export type ProposalStatus = "draft" | "sent" | "accepted" | "declined" | "expired";

export interface ProposalItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Proposal {
  id: string;
  userId: string;
  clientId: string;
  clientName: string;
  projectName: string;
  status: ProposalStatus;
  items: ProposalItem[];
  currency: Currency;
  subtotal: number;
  total: number;
  validUntil: string;
  scope?: string;
  deliverables?: string;
  notes?: string;
  createdAt: string;
  sentAt?: string;
  respondedAt?: string;
  convertedToInvoiceId?: string;
  convertedToContractId?: string;
  convertedToProjectId?: string;
}

export const MOCK_PROPOSALS: Proposal[] = [
  {
    id: "prop_001",
    userId: "user_mock_001",
    clientId: "client_001",
    clientName: "Acme Corp",
    projectName: "Website Redesign Q1 2025",
    status: "accepted",
    items: [
      { description: "UX research & information architecture", quantity: 1, unitPrice: 900, total: 900 },
      { description: "UI design — homepage & 4 inner pages", quantity: 1, unitPrice: 2100, total: 2100 },
      { description: "Responsive development handoff", quantity: 1, unitPrice: 600, total: 600 },
    ],
    currency: "EUR",
    subtotal: 3600,
    total: 3600,
    validUntil: "2025-02-15",
    scope: "Full redesign of acmecorp.com covering the homepage, about, services, portfolio, and contact pages. Mobile-first approach. Deliverables via Figma.",
    deliverables: "Figma design file, component library, responsive specs, 2 rounds of revisions included.",
    notes: "Payment: 50% upfront, 50% on delivery. Net 14.",
    createdAt: "2025-01-28T09:00:00Z",
    sentAt: "2025-01-28T09:30:00Z",
    respondedAt: "2025-02-03T14:00:00Z",
    convertedToInvoiceId: "inv_005",
  },
  {
    id: "prop_002",
    userId: "user_mock_001",
    clientId: "client_003",
    clientName: "Fjord Ventures",
    projectName: "Product Design Sprint — Phase 2",
    status: "sent",
    items: [
      { description: "2-week design sprint (80 hrs @ €100/hr)", quantity: 80, unitPrice: 100, total: 8000 },
      { description: "Prototype & user testing report", quantity: 1, unitPrice: 500, total: 500 },
    ],
    currency: "EUR",
    subtotal: 8500,
    total: 8500,
    validUntil: "2025-04-10",
    scope: "Phase 2 of the product design sprint: detailed UI design for the core dashboard, user testing with 5 participants, and a written usability report.",
    deliverables: "High-fidelity Figma prototype, usability test report, design handoff specs.",
    notes: "Follows directly from Phase 1 completed in March. Preferred start: April 14.",
    createdAt: "2025-03-28T10:00:00Z",
    sentAt: "2025-03-28T10:30:00Z",
  },
  {
    id: "prop_003",
    userId: "user_mock_001",
    clientId: "client_005",
    clientName: "Kite Analytics",
    projectName: "Mobile App Extension",
    status: "draft",
    items: [
      { description: "iOS & Android mobile UI design", quantity: 1, unitPrice: 4200, total: 4200 },
      { description: "Design system extension for mobile", quantity: 1, unitPrice: 1800, total: 1800 },
    ],
    currency: "EUR",
    subtotal: 6000,
    total: 6000,
    validUntil: "2025-04-30",
    scope: "Design a mobile companion app (iOS + Android) that mirrors the core analytics dashboard features. Uses the existing design system established in the web project.",
    deliverables: "Complete Figma file with all screens, mobile design system tokens, developer handoff.",
    notes: "Draft — pending final scope confirmation from Kite engineering team.",
    createdAt: "2025-03-25T14:00:00Z",
  },
  {
    id: "prop_004",
    userId: "user_mock_001",
    clientId: "client_004",
    clientName: "Pulse Health",
    projectName: "Design System Audit",
    status: "declined",
    items: [
      { description: "Component audit & documentation", quantity: 1, unitPrice: 2400, total: 2400 },
      { description: "Accessibility review", quantity: 1, unitPrice: 800, total: 800 },
    ],
    currency: "USD",
    subtotal: 3200,
    total: 3200,
    validUntil: "2025-03-01",
    scope: "Audit of the existing Pulse Health design system. Document inconsistencies, accessibility issues, and recommend a consolidation roadmap.",
    notes: "Client decided to handle audit internally.",
    createdAt: "2025-02-10T11:00:00Z",
    sentAt: "2025-02-10T11:30:00Z",
    respondedAt: "2025-02-25T09:00:00Z",
  },
];

// ─── Contracts ────────────────────────────────────────────────────────────────

export type ContractStatus = "draft" | "sent" | "signed" | "active" | "completed" | "cancelled";
export type RateType = "hourly" | "fixed" | "monthly";

export interface Contract {
  id: string;
  userId: string;
  clientId: string;
  clientName: string;
  projectName: string;
  status: ContractStatus;
  proposalId?: string;
  rate: number;
  rateType: RateType;
  currency: Currency;
  paymentTermsDays: number;
  startDate: string;
  endDate?: string;
  scope: string;
  deliverables: string;
  revisionPolicy?: string;
  terminationClause?: string;
  notes?: string;
  createdAt: string;
  signedAt?: string;
  freelancerSignatureName?: string;
  // E-signature fields
  clientSignatureName?: string;
  clientSignedAt?: string;
}

export const MOCK_CONTRACTS: Contract[] = [
  {
    id: "con_001",
    userId: "user_mock_001",
    clientId: "client_001",
    clientName: "Acme Corp",
    projectName: "Website Redesign Q1 2025",
    status: "active",
    proposalId: "prop_001",
    rate: 3600,
    rateType: "fixed",
    currency: "EUR",
    paymentTermsDays: 14,
    startDate: "2025-02-10",
    endDate: "2025-04-10",
    scope: "Full redesign of acmecorp.com covering the homepage, about, services, portfolio, and contact pages. Mobile-first approach. All deliverables via Figma.",
    deliverables: "Figma design file with all pages, component library, responsive specifications, and 2 rounds of revisions included per page.",
    revisionPolicy: "Up to 2 rounds of revisions per page are included. Additional revisions billed at €90/hr.",
    terminationClause: "Either party may terminate with 7 days written notice. Work completed to date will be invoiced.",
    createdAt: "2025-02-05T10:00:00Z",
    signedAt: "2025-02-10T14:00:00Z",
  },
  {
    id: "con_002",
    userId: "user_mock_001",
    clientId: "client_002",
    clientName: "NordMedia AS",
    projectName: "Monthly Design Retainer",
    status: "active",
    rate: 1800,
    rateType: "monthly",
    currency: "EUR",
    paymentTermsDays: 14,
    startDate: "2024-09-01",
    scope: "Monthly design retainer covering up to 20 hours of design work. Scope includes social media templates, landing page design, marketing collateral, and brand updates as requested.",
    deliverables: "Minimum 20 hrs/month of design output. Deliverables agreed at the start of each month.",
    revisionPolicy: "Unlimited revisions within the monthly retainer hours.",
    terminationClause: "30 days written notice required to end the retainer. Final month invoiced in full.",
    createdAt: "2024-08-25T09:00:00Z",
    signedAt: "2024-09-01T00:00:00Z",
  },
  {
    id: "con_003",
    userId: "user_mock_001",
    clientId: "client_005",
    clientName: "Kite Analytics",
    projectName: "SaaS Dashboard Redesign",
    status: "completed",
    rate: 85,
    rateType: "hourly",
    currency: "EUR",
    paymentTermsDays: 30,
    startDate: "2025-01-20",
    endDate: "2025-03-01",
    scope: "UX research and UI design for the Kite Analytics SaaS dashboard. Covers the main analytics views, chart components, data tables, and settings screens.",
    deliverables: "UX research report, wireframes, high-fidelity UI designs for all screens, Figma component library.",
    revisionPolicy: "3 rounds of revisions included. Additional rounds at €85/hr.",
    terminationClause: "7 days notice required. Hours worked billed at standard rate.",
    createdAt: "2025-01-15T11:00:00Z",
    signedAt: "2025-01-20T09:00:00Z",
  },
  {
    id: "con_004",
    userId: "user_mock_001",
    clientId: "client_003",
    clientName: "Fjord Ventures",
    projectName: "Product Design Sprint — Phase 1",
    status: "completed",
    rate: 100,
    rateType: "hourly",
    currency: "EUR",
    paymentTermsDays: 14,
    startDate: "2025-03-03",
    endDate: "2025-03-28",
    scope: "Phase 1 design sprint: problem framing, ideation, concept selection, and interactive Figma prototype.",
    deliverables: "Journey maps, concept sketches, interactive prototype, sprint documentation.",
    revisionPolicy: "2 rounds of revisions on the prototype included.",
    terminationClause: "7 days notice. Hours worked billed in full.",
    createdAt: "2025-02-28T10:00:00Z",
    signedAt: "2025-03-03T08:00:00Z",
  },
];

// ─── Projects ─────────────────────────────────────────────────────────────────

export type ProjectStatus = "active" | "on-hold" | "completed" | "cancelled";

export interface Project {
  id: string;
  userId: string;
  clientId: string;
  clientName: string;
  name: string;
  status: ProjectStatus;
  budgetAmount?: number;
  currency: Currency;
  startDate: string;
  endDate?: string;
  contractId?: string;
  proposalId?: string;
  notes?: string;
  createdAt: string;
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: "proj_001",
    userId: "user_mock_001",
    clientId: "client_001",
    clientName: "Acme Corp",
    name: "Website Redesign Q1 2025",
    status: "active",
    budgetAmount: 3600,
    currency: "EUR",
    startDate: "2025-02-10",
    endDate: "2025-04-10",
    contractId: "con_001",
    proposalId: "prop_001",
    notes: "Homepage done. Inner pages in progress.",
    createdAt: "2025-02-05T10:00:00Z",
  },
  {
    id: "proj_002",
    userId: "user_mock_001",
    clientId: "client_002",
    clientName: "NordMedia AS",
    name: "Monthly Design Retainer",
    status: "active",
    budgetAmount: 1800,
    currency: "EUR",
    startDate: "2024-09-01",
    contractId: "con_002",
    notes: "Ongoing monthly retainer. Auto-renews.",
    createdAt: "2024-08-25T09:00:00Z",
  },
  {
    id: "proj_003",
    userId: "user_mock_001",
    clientId: "client_003",
    clientName: "Fjord Ventures",
    name: "Product Design Sprint — Phase 1",
    status: "completed",
    budgetAmount: 8500,
    currency: "EUR",
    startDate: "2025-03-03",
    endDate: "2025-03-28",
    contractId: "con_004",
    proposalId: undefined,
    notes: "Phase 1 complete. Phase 2 proposal sent.",
    createdAt: "2025-02-28T10:00:00Z",
  },
  {
    id: "proj_004",
    userId: "user_mock_001",
    clientId: "client_004",
    clientName: "Pulse Health",
    name: "Mobile App UI Design",
    status: "on-hold",
    budgetAmount: 4565,
    currency: "USD",
    startDate: "2025-01-06",
    notes: "Blocked — waiting on API specs from engineering team.",
    createdAt: "2024-12-15T10:00:00Z",
  },
  {
    id: "proj_005",
    userId: "user_mock_001",
    clientId: "client_005",
    clientName: "Kite Analytics",
    name: "SaaS Dashboard Redesign",
    status: "completed",
    budgetAmount: 3600,
    currency: "EUR",
    startDate: "2025-01-20",
    endDate: "2025-03-01",
    contractId: "con_003",
    notes: "Delivered and approved. Invoice sent.",
    createdAt: "2025-01-15T11:00:00Z",
  },
];

export const MOCK_CLIENT_PORTALS: ClientPortal[] = [
  {
    clientId: "client_001",
    token: "ptk_acme2025xf9a",
    isEnabled: true,
    freelancerName: "Ivan de Vries",
    headerNote: "Hi Acme team — use this portal to track project progress, access files, and leave feedback.",
    allowFeedback: true,
    showInvoices: true,
    showFiles: true,
    showUpdates: true,
  },
  {
    clientId: "client_002",
    token: "ptk_nordmedia8bk2",
    isEnabled: true,
    freelancerName: "Ivan de Vries",
    headerNote: "Your monthly retainer portal. New assets are added here when ready.",
    allowFeedback: true,
    showInvoices: false,
    showFiles: true,
    showUpdates: true,
  },
  {
    clientId: "client_003",
    token: "ptk_fjord3yz7qr",
    isEnabled: false,
    freelancerName: "Ivan de Vries",
    headerNote: undefined,
    allowFeedback: true,
    showInvoices: true,
    showFiles: true,
    showUpdates: true,
  },
  {
    clientId: "client_004",
    token: "ptk_pulse9mx1wv",
    isEnabled: true,
    freelancerName: "Ivan de Vries",
    headerNote: "Pulse Health project portal — designs and updates posted here.",
    allowFeedback: true,
    showInvoices: true,
    showFiles: true,
    showUpdates: true,
  },
  {
    clientId: "client_005",
    token: "ptk_kite4np8cs",
    isEnabled: false,
    freelancerName: "Ivan de Vries",
    headerNote: undefined,
    allowFeedback: false,
    showInvoices: true,
    showFiles: false,
    showUpdates: true,
  },
];

// ─── Lead Pipeline ────────────────────────────────────────────────────────────

export type LeadStage = "prospect" | "qualified" | "proposal" | "won" | "lost";
export type LeadSource = "referral" | "linkedin" | "upwork" | "fiverr" | "website" | "cold" | "other";

export interface Lead {
  id: string;
  userId: string;
  name: string;
  company: string;
  email?: string;
  source: LeadSource;
  stage: LeadStage;
  estimatedValue?: number;
  currency: Currency;
  notes?: string;
  convertedToClientId?: string;
  createdAt: string;
  updatedAt: string;
}

export const MOCK_LEADS: Lead[] = [
  {
    id: "lead_001",
    userId: "user_mock_001",
    name: "Sarah Mitchell",
    company: "Bloom Digital Agency",
    email: "sarah@bloomdigital.io",
    source: "linkedin",
    stage: "qualified",
    estimatedValue: 8500,
    currency: "EUR",
    notes: "Needs a full brand identity + website. Budget confirmed. Decision by end of April.",
    createdAt: "2025-03-10T10:00:00Z",
    updatedAt: "2025-03-22T14:00:00Z",
  },
  {
    id: "lead_002",
    userId: "user_mock_001",
    name: "Tom Berger",
    company: "Norda Labs",
    email: "tom@nordalabs.com",
    source: "referral",
    stage: "proposal",
    estimatedValue: 4200,
    currency: "EUR",
    notes: "Referred by Acme Corp. Wants a SaaS dashboard redesign. Proposal sent 2025-03-20.",
    createdAt: "2025-03-15T09:00:00Z",
    updatedAt: "2025-03-20T16:00:00Z",
  },
  {
    id: "lead_003",
    userId: "user_mock_001",
    name: "Lena Osei",
    company: "Verde Studio",
    email: "lena@verdestudio.co",
    source: "website",
    stage: "prospect",
    estimatedValue: 2000,
    currency: "EUR",
    notes: "Filled in contact form. Interested in logo + brand guidelines. Not yet qualified.",
    createdAt: "2025-03-25T11:00:00Z",
    updatedAt: "2025-03-25T11:00:00Z",
  },
  {
    id: "lead_004",
    userId: "user_mock_001",
    name: "David Park",
    company: "Atlas Fintech",
    email: "dpark@atlasfintech.com",
    source: "cold",
    stage: "won",
    estimatedValue: 12000,
    currency: "EUR",
    notes: "Won! Full design system project. Contract being drafted.",
    createdAt: "2025-02-01T09:00:00Z",
    updatedAt: "2025-03-18T10:00:00Z",
  },
  {
    id: "lead_005",
    userId: "user_mock_001",
    name: "Emma Johansson",
    company: "Pixel & Pine",
    email: "emma@pixelandpine.se",
    source: "upwork",
    stage: "lost",
    estimatedValue: 3500,
    currency: "EUR",
    notes: "Went with another freelancer. Lower price point. Follow up in Q3.",
    createdAt: "2025-02-10T14:00:00Z",
    updatedAt: "2025-03-05T09:00:00Z",
  },
  {
    id: "lead_006",
    userId: "user_mock_001",
    name: "Carlos Mendes",
    company: "Sunbeam Health",
    email: "carlos@sunbeamhealth.com",
    source: "referral",
    stage: "qualified",
    estimatedValue: 5500,
    currency: "EUR",
    notes: "Referred by NordMedia. Mobile app UI for a wellness tracker. Budget approved.",
    createdAt: "2025-03-28T10:00:00Z",
    updatedAt: "2025-03-28T10:00:00Z",
  },
];
