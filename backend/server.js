import "dotenv/config";
import express from "express";
import fs from "fs";
import multer from "multer";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectToDatabase } from "./db.js";
import { tenants as fallbackTenants, salesDashboard as fallbackDashboard, XTREATIVE_TENANT_ID } from "./data/currentData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET is missing from .env");
}

app.use(express.json());
const configuredOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (configuredOrigins.includes(origin)) return callback(null, true);

    try {
      const url = new URL(origin);
      if (["localhost", "127.0.0.1"].includes(url.hostname) && process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
    } catch {
      // Fall through to the configured-origin rejection.
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

function signUser(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      name: user.name,
    },
    jwtSecret,
    { expiresIn: "8h" },
  );
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    return res.status(401).json({ message: "Session expired. Please log in again." });
  }
}

function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== "superadmin") {
    return res.status(403).json({ message: "Super admin access required" });
  }
  next();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const db = await connectToDatabase();
  const user = await db.collection("users").findOne({ email: String(email).toLowerCase().trim() });

  if (!user || user.status !== "Active") {
    return res.status(401).json({ message: "Invalid login details" });
  }

  const passwordMatches = await bcrypt.compare(String(password), user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid login details" });
  }

  const tenant = user.tenantId
    ? await db.collection("tenants").findOne({ tenantId: user.tenantId }, { projection: { _id: 0 } })
    : null;

  const safeUser = {
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: tenant?.name ?? null,
    tenantLogo: tenant?.logoUrl ?? null,
  };

  res.json({ token: signUser(user), user: safeUser });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  const db = await connectToDatabase();
  const user = await db.collection("users").findOne({ email: req.user.email }, { projection: { passwordHash: 0 } });
  if (!user) return res.status(404).json({ message: "User not found" });

  const tenant = user.tenantId
    ? await db.collection("tenants").findOne({ tenantId: user.tenantId }, { projection: { _id: 0 } })
    : null;

  res.json({
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: tenant?.name ?? null,
      tenantLogo: tenant?.logoUrl ?? null,
    },
  });
});

// Ensure uploads directory exists
const uploadsRoot = path.join(__dirname, "..", "public", "uploads", "tenants");
fs.mkdirSync(uploadsRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadsRoot);
  },
  filename: function (_req, file, cb) {
    const name = `${Date.now()}-${file.originalname.replace(/[^a-z0-9.\-]/gi, "-")}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

app.post("/api/admin/tenant-logo", requireAuth, requireSuperAdmin, upload.single("logo"), async (req, res) => {
  try {
    const tenantId = req.body.tenantId;
    if (!tenantId) return res.status(400).json({ message: "tenantId required" });
    if (!req.file) return res.status(400).json({ message: "logo file is required" });

    const logoPath = `/uploads/tenants/${req.file.filename}`;
    const db = await connectToDatabase();
    await db.collection("tenants").updateOne({ tenantId }, { $set: { logoUrl: logoPath } });

    res.status(201).json({ message: "Logo uploaded", logoUrl: logoPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
});

app.get("/api/dashboard/sales", requireAuth, async (req, res) => {
  if (!["sales_agent", "tenant_admin", "superadmin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Dashboard access denied" });
  }

  const db = await connectToDatabase();
  const tenantId = req.user.tenantId || XTREATIVE_TENANT_ID;
  const dashboard = await db.collection("dashboardData").findOne(
    { key: "sales-dashboard", tenantId },
    { projection: { _id: 0 } },
  );

  res.json(dashboard || { key: "sales-dashboard", ...fallbackDashboard });
});

app.get("/api/admin/tenants", requireAuth, requireSuperAdmin, async (_req, res) => {
  const db = await connectToDatabase();
  const tenants = await db.collection("tenants").find({}, { projection: { _id: 0 } }).sort({ name: 1 }).toArray();
  res.json({ tenants: tenants.length ? tenants : fallbackTenants });
});

// CRUD endpoints for sales agent actions (persist and also update sales-dashboard)
app.post("/api/leads", requireAuth, async (req, res) => {
  const { name, co, src, status = "New", score, on, telephone, email, position, rating } = req.body || {};
  if (!name) return res.status(400).json({ message: "Lead name is required" });

  const db = await connectToDatabase();
  const tenantId = req.user.tenantId || XTREATIVE_TENANT_ID;

  // Map rating to score if score not provided
  const ratingMap = { Cold: 30, Warm: 60, Hot: 90 };
  const computedScore = typeof score === "number" ? score : (rating && ratingMap[rating]) ? ratingMap[rating] : 0;

  const lead = {
    name: String(name).trim(),
    co: co ? String(co).trim() : "",
    src: src || "Unknown",
    status,
    score: computedScore,
    on: on || new Date().toLocaleDateString("en-US"),
    telephone: telephone || "",
    email: email || "",
    position: position || "",
    rating: rating || "",
  };

  await db.collection("leads").insertOne({ ...lead, tenantId, createdAt: new Date() });
  await db.collection("dashboardData").updateOne(
    { key: "sales-dashboard", tenantId },
    { $push: { leads: { $each: [lead], $position: 0 } } },
    { upsert: true },
  );

  res.status(201).json({ lead });
});

app.post("/api/deals", requireAuth, async (req, res) => {
  const { n, stage = "Contacted", amt = "$0", close, prob } = req.body || {};
  if (!n) return res.status(400).json({ message: "Deal name is required" });

  const db = await connectToDatabase();
  const tenantId = req.user.tenantId || XTREATIVE_TENANT_ID;

  // Calculate probability based on stage if not provided
  const stageProbMap = {
    Contacted: 20,
    Proposal: 50,
    Negotiations: 70,
    Closed: 100,
    Won: 100,
    Lost: 0,
    New: 10,
  };

  const computedProb = typeof prob === "number" ? prob : (stageProbMap[stage] ?? 0);
  const deal = { n: String(n).trim(), stage, amt, close: close || new Date().toLocaleDateString("en-US"), prob: computedProb };

  await db.collection("deals").insertOne({ ...deal, tenantId, createdAt: new Date() });
  await db.collection("dashboardData").updateOne(
    { key: "sales-dashboard", tenantId },
    { $push: { deals: { $each: [deal], $position: 0 } } },
    { upsert: true },
  );

  res.status(201).json({ deal });
});

// Clients
app.post("/api/clients", requireAuth, async (req, res) => {
  const { companyName, companyEmail, address, contactName, contactTel, contactEmail, position, sector } = req.body || {};
  if (!companyName) return res.status(400).json({ message: "Company name is required" });

  const db = await connectToDatabase();
  const tenantId = req.user.tenantId || XTREATIVE_TENANT_ID;
  const client = {
    companyName: String(companyName).trim(),
    companyEmail: companyEmail || "",
    address: address || "",
    contact: contactName ? { name: contactName, tel: contactTel || "", email: contactEmail || "", position: position || "" } : null,
    sector: sector || "",
  };

  await db.collection("clients").insertOne({ ...client, tenantId, createdAt: new Date() });
  await db.collection("dashboardData").updateOne(
    { key: "sales-dashboard", tenantId },
    { $push: { clients: { $each: [client], $position: 0 } } },
    { upsert: true },
  );

  res.status(201).json({ client });
});

// Contacts
app.post("/api/contacts", requireAuth, async (req, res) => {
  const { name, organization, tel, email, position, birthday, reportingLine } = req.body || {};
  if (!name) return res.status(400).json({ message: "Contact name is required" });

  const db = await connectToDatabase();
  const tenantId = req.user.tenantId || XTREATIVE_TENANT_ID;
  const contact = { name: String(name).trim(), organization: organization || "", tel: tel || "", email: email || "", position: position || "", birthday: birthday || "", reportingLine: reportingLine || "" };

  await db.collection("contacts").insertOne({ ...contact, tenantId, createdAt: new Date() });
  await db.collection("dashboardData").updateOne(
    { key: "sales-dashboard", tenantId },
    { $push: { contacts: { $each: [contact], $position: 0 } } },
    { upsert: true },
  );

  res.status(201).json({ contact });
});

app.post("/api/meetings", requireAuth, async (req, res) => {
  const { co, t, date, time } = req.body || {};
  if (!co || !t) return res.status(400).json({ message: "Meeting company and title are required" });

  const db = await connectToDatabase();
  const tenantId = req.user.tenantId || XTREATIVE_TENANT_ID;
  const meeting = { co: String(co).trim(), t: String(t).trim(), date: date || new Date().toLocaleDateString("en-US"), time: time || "" };

  await db.collection("meetings").insertOne({ ...meeting, tenantId, createdAt: new Date() });
  await db.collection("dashboardData").updateOne(
    { key: "sales-dashboard", tenantId },
    { $push: { meetings: { $each: [meeting], $position: 0 } } },
    { upsert: true },
  );

  res.status(201).json({ meeting });
});

app.post("/api/tasks", requireAuth, async (req, res) => {
  const { t, time, p = "Low" } = req.body || {};
  if (!t) return res.status(400).json({ message: "Task title is required" });

  const db = await connectToDatabase();
  const tenantId = req.user.tenantId || XTREATIVE_TENANT_ID;
  const task = { t: String(t).trim(), time: time || "", p };

  await db.collection("tasks").insertOne({ ...task, tenantId, createdAt: new Date() });
  await db.collection("dashboardData").updateOne(
    { key: "sales-dashboard", tenantId },
    { $push: { tasks: { $each: [task], $position: 0 } } },
    { upsert: true },
  );

  res.status(201).json({ task });
});

// Send Email
app.post("/api/email/send", requireAuth, async (req, res) => {
  const { to, subject, body } = req.body || {};
  if (!to || !subject || !body) return res.status(400).json({ message: "To, subject, and body are required" });

  // Log email action (in production, use nodemailer or SendGrid)
  console.log(`[Email] From: florencenamukisa08@gmail.com, To: ${to}, Subject: ${subject}`);

  const db = await connectToDatabase();
  const tenantId = req.user.tenantId || XTREATIVE_TENANT_ID;
  const email = {
    from: "florencenamukisa08@gmail.com",
    to: String(to).trim(),
    subject: String(subject).trim(),
    body: String(body).trim(),
    sentAt: new Date(),
  };

  await db.collection("emails").insertOne({ ...email, tenantId, createdAt: new Date() });
  res.status(201).json({ email, message: "Email queued for sending (demo)" });
});

// WhatsApp link generator
app.post("/api/whatsapp/open", requireAuth, async (req, res) => {
  const { phoneNumber, message } = req.body || {};
  if (!phoneNumber) return res.status(400).json({ message: "Phone number is required" });

  const cleanPhone = String(phoneNumber).replace(/[^\d+]/g, "");
  const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message || "Hi! I'm contacting you regarding a sales inquiry.")}`;

  const db = await connectToDatabase();
  const tenantId = req.user.tenantId || XTREATIVE_TENANT_ID;
  await db.collection("whatsapp_logs").insertOne({
    phoneNumber: cleanPhone,
    message: message || "",
    initiatedAt: new Date(),
    tenantId,
  });

  res.json({ whatsappLink });
});

app.post("/api/admin/tenants", requireAuth, requireSuperAdmin, async (req, res) => {
  const { name, plan = "Standard", status = "Active" } = req.body || {};
  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ message: "Tenant name is required" });
  }

  const tenantId = String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const db = await connectToDatabase();
  const tenant = {
    tenantId,
    slug: tenantId,
    name: String(name).trim(),
    plan,
    users: 0,
    status,
    mrr: "$0",
    joined: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    createdAt: new Date(),
  };

  await db.collection("tenants").updateOne({ tenantId }, { $setOnInsert: tenant }, { upsert: true });
  const saved = await db.collection("tenants").findOne({ tenantId }, { projection: { _id: 0 } });
  res.status(201).json({ tenant: saved });
});

// Serve uploaded tenant logos
app.use("/uploads", express.static(path.join(__dirname, "..", "public", "uploads")));

const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.use((_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
