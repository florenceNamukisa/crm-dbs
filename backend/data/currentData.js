export const XTREATIVE_TENANT_ID = "xtreative-market";

export const tenants = [
  { tenantId: XTREATIVE_TENANT_ID, name: "Xtreative Market Company", plan: "Enterprise", users: 1, status: "Active", mrr: "$12,450", joined: "May 31, 2025" },
  { tenantId: "global-marketing", name: "Global Marketing Co.", plan: "Professional", users: 156, status: "Active", mrr: "$8,920", joined: "May 30, 2025" },
  { tenantId: "data-pro-systems", name: "Data Pro Systems", plan: "Enterprise", users: 320, status: "Active", mrr: "$15,680", joined: "May 29, 2025" },
  { tenantId: "bright-future", name: "Bright Future Ltd.", plan: "Standard", users: 85, status: "Active", mrr: "$4,750", joined: "May 28, 2025" },
  { tenantId: "cloud-services", name: "Cloud Services LLC", plan: "Professional", users: 178, status: "Active", mrr: "$7,890", joined: "May 28, 2025" },
  { tenantId: "greenfield-agro", name: "GreenField Agro Ltd.", plan: "Basic", users: 64, status: "Trial", mrr: "$0", joined: "May 27, 2025" },
  { tenantId: "nextgen-innovations", name: "NextGen Innovations", plan: "Standard", users: 132, status: "Suspended", mrr: "$0", joined: "May 25, 2025" },
];

export const salesDashboard = {
  tenantId: XTREATIVE_TENANT_ID,
  kpis: [
    { label: "Leads Assigned", value: "125", trend: 18, up: true },
    { label: "Active Deals", value: "28", trend: 12, up: true },
    { label: "Won Deals", value: "15", trend: 25, up: true },
    { label: "Pipeline Value", value: "$245,800", trend: 16, up: true },
    { label: "Revenue (This Month)", value: "$89,450", trend: 20, up: true },
    { label: "Conversion Rate", value: "18.6%", trend: 2.4, up: true },
    { label: "Tasks Due Today", value: "8", trend: 11, up: false },
    { label: "Follow-ups Due", value: "14", trend: 7, up: false },
  ],
  pipeline: [
    { stage: "New Lead", n: 50, pct: 100 },
    { stage: "Contacted", n: 35, pct: 70 },
    { stage: "Qualified", n: 24, pct: 48 },
    { stage: "Proposal Sent", n: 18, pct: 36 },
    { stage: "Negotiation", n: 12, pct: 24 },
    { stage: "Won", n: 15, pct: 30 },
  ],
  revenue: [
    { d: "May 01", v: 18000 }, { d: "May 06", v: 32000 }, { d: "May 11", v: 28000 },
    { d: "May 16", v: 45000 }, { d: "May 21", v: 52000 }, { d: "May 26", v: 70000 }, { d: "May 31", v: 89000 },
  ],
  sources: [
    { name: "Website", value: 35, pct: 28, color: "#ff6a00" },
    { name: "Referral", value: 28, pct: 22, color: "#ff8c00" },
    { name: "Social Media", value: 25, pct: 20, color: "#ffb347" },
    { name: "Email Campaign", value: 18, pct: 14, color: "#a855f7" },
    { name: "Cold Call", value: 12, pct: 10, color: "#6366f1" },
    { name: "Others", value: 7, pct: 6, color: "#22c55e" },
  ],
  tasks: [
    { t: "Follow up with Tech Solutions Inc.", time: "10:00 AM", p: "High" },
    { t: "Send proposal to Global Marketing Co.", time: "11:30 AM", p: "High" },
    { t: "Call Sarah Williams", time: "02:00 PM", p: "Medium" },
    { t: "Prepare quote for Bright Future Ltd.", time: "03:30 PM", p: "Medium" },
    { t: "Follow up with Data Pro Systems", time: "05:00 PM", p: "Low" },
    { t: "Meeting with Cloud Services LLC", time: "06:00 PM", p: "Low" },
  ],
  leads: [
    { name: "Michael Johnson", co: "Tech Solutions Inc.", src: "Website", status: "New", score: 85, on: "May 30, 2025" },
    { name: "Sarah Williams", co: "Global Marketing Co.", src: "Referral", status: "Contacted", score: 78, on: "May 30, 2025" },
    { name: "David Brown", co: "Data Pro Systems", src: "Social Media", status: "Qualified", score: 72, on: "May 29, 2025" },
    { name: "Emma Davis", co: "Bright Future Ltd.", src: "Email Campaign", status: "New", score: 65, on: "May 29, 2025" },
    { name: "James Wilson", co: "Cloud Services LLC", src: "Cold Call", status: "Contacted", score: 60, on: "May 28, 2025" },
  ],
  deals: [
    { n: "Tech Solutions CRM Deal", stage: "Proposal Sent", amt: "$25,000", close: "Jun 05, 2025", prob: 75 },
    { n: "Global Marketing Project", stage: "Negotiation", amt: "$18,500", close: "Jun 10, 2025", prob: 60 },
    { n: "Data Pro Systems Deal", stage: "Qualified", amt: "$32,000", close: "Jun 15, 2025", prob: 50 },
    { n: "Bright Future Implementation", stage: "Proposal Sent", amt: "$12,750", close: "Jun 20, 2025", prob: 70 },
    { n: "Cloud Services Contract", stage: "Negotiation", amt: "$45,000", close: "Jun 25, 2025", prob: 65 },
  ],
  meetings: [
    { co: "Tech Solutions Inc.", t: "Product Demo", date: "May 31, 2025", time: "10:00 AM" },
    { co: "Global Marketing Co.", t: "Proposal Discussion", date: "May 31, 2025", time: "02:00 PM" },
    { co: "Data Pro Systems", t: "Requirement Review", date: "Jun 01, 2025", time: "11:00 AM" },
    { co: "Cloud Services LLC", t: "Contract Discussion", date: "Jun 01, 2025", time: "04:00 PM" },
  ],
  followups: [
    { name: "Sarah Williams", co: "Global Marketing Co.", when: "Today" },
    { name: "Michael Johnson", co: "Tech Solutions Inc.", when: "Tomorrow" },
    { name: "David Brown", co: "Data Pro Systems", when: "Jun 02, 2025" },
    { name: "Emma Davis", co: "Bright Future Ltd.", when: "Jun 03, 2025" },
    { name: "James Wilson", co: "Cloud Services LLC", when: "Jun 04, 2025" },
  ],
  activities: [
    { t: "New lead assigned: Tech Solutions Inc.", when: "2 min ago" },
    { t: "Sarah Williams opened your email", when: "15 min ago" },
    { t: "Follow-up completed with Data Pro Systems", when: "1 hour ago" },
    { t: "Deal won: Bright Future Ltd.", when: "2 hours ago" },
    { t: "Invoice INV-2025-0056 created", when: "3 hours ago" },
  ],
  messages: [
    { name: "Sarah Williams", msg: "Please find the proposal attached.", time: "10:30 AM", n: 2 },
    { name: "Michael Johnson", msg: "Can we schedule a call today?", time: "09:15 AM", n: 1 },
    { name: "Global Marketing Co.", msg: "Re: Proposal for CRM Implementation", time: "Yesterday" },
    { name: "+1 (555) 123-4567", msg: "WhatsApp message", time: "Yesterday" },
  ],
};

