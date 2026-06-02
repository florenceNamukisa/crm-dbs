import "dotenv/config";
import bcrypt from "bcryptjs";
import { closeDatabase, connectToDatabase } from "./db.js";
import { salesDashboard, tenants, XTREATIVE_TENANT_ID } from "./data/currentData.js";

const SUPER_ADMIN_EMAIL = "florencenamukisa08@gmail.com";
const SALES_AGENT_EMAIL = "florence123n@gmail.com";
const DEFAULT_PASSWORD = "ChangeMe123!";

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function createIndexIfPossible(collection, key, options) {
  try {
    await collection.createIndex(key, options);
  } catch (error) {
    if (error?.code !== 86) throw error;
  }
}

async function main() {
  const db = await connectToDatabase();
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || DEFAULT_PASSWORD;
  const salesAgentPassword = process.env.SALES_AGENT_PASSWORD || DEFAULT_PASSWORD;

  await Promise.all([
    db.collection("users").deleteMany({}),
    db.collection("tenants").deleteMany({}),
    db.collection("dashboardData").deleteMany({}),
  ]);

  await db.collection("tenants").insertMany(tenants.map((tenant) => ({ ...tenant, slug: tenant.tenantId })));

  // Create an empty sales-dashboard document for the main tenant (no dummy data)
  await db.collection("dashboardData").insertOne({
    key: "sales-dashboard",
    tenantId: XTREATIVE_TENANT_ID,
    kpis: [],
    pipeline: [],
    revenue: [],
    sources: [],
    tasks: [],
    leads: [],
    deals: [],
    meetings: [],
    followups: [],
    activities: [],
    messages: [],
    clients: [],
    contacts: [],
    seededAt: new Date(),
  });

  await db.collection("users").insertMany([
    {
      name: "Florence Namukisa",
      email: SUPER_ADMIN_EMAIL,
      role: "superadmin",
      tenantId: null,
      status: "Active",
      passwordHash: await hashPassword(superAdminPassword),
      createdAt: new Date(),
    },
    {
      name: "Florence Sales",
      email: SALES_AGENT_EMAIL,
      role: "sales_agent",
      tenantId: XTREATIVE_TENANT_ID,
      status: "Active",
      passwordHash: await hashPassword(salesAgentPassword),
      createdAt: new Date(),
    },
  ]);

  await createIndexIfPossible(db.collection("users"), { email: 1 }, { unique: true });
  await createIndexIfPossible(db.collection("tenants"), { tenantId: 1 }, { unique: true });
  await createIndexIfPossible(db.collection("dashboardData"), { key: 1 }, { unique: true });

  console.log("Seed complete. Passwords were stored as bcrypt hashes only.");
  if (!process.env.SUPER_ADMIN_PASSWORD || !process.env.SALES_AGENT_PASSWORD) {
    console.log("Set SUPER_ADMIN_PASSWORD and SALES_AGENT_PASSWORD in .env to override the temporary seed password.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
