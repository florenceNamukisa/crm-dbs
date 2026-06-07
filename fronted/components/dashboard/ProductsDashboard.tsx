import { Package, CheckCircle2, Wrench, DollarSign } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { KpiCard, PageHeader, SectionCard } from "./parts";
import { DataSection } from "./EntityDashboard";

const cats = [
  { name: "Software", v: 35, color: "#ff6a00" },
  { name: "Hardware", v: 25, color: "#ff8c00" },
  { name: "Services", v: 20, color: "#ffb347" },
  { name: "Subscription", v: 10, color: "#a855f7" },
  { name: "Others", v: 10, color: "#22c55e" },
];
const top = [
  { p: "CRM Professional Plan", v: "$45,600" },
  { p: "Cloud Storage 1TB", v: "$38,750" },
  { p: "Implementation Service", v: "$28,450" },
  { p: "Premium Support", v: "$18,900" },
  { p: "Analytics Dashboard", v: "$15,600" },
];
const rows = [
  { p: "CRM Professional Plan", cat: "Software", type: "Subscription", price: "$99.00", status: "Active", sold: 156, revenue: "$45,600" },
  { p: "Cloud Storage 1TB", cat: "Services", type: "Subscription", price: "$49.00", status: "Active", sold: 245, revenue: "$38,750" },
  { p: "Implementation Service", cat: "Services", type: "One-time", price: "$1,499.00", status: "Active", sold: 19, revenue: "$28,450" },
  { p: "Premium Support", cat: "Services", type: "Subscription", price: "$199.00", status: "Active", sold: 95, revenue: "$18,900" },
  { p: "Analytics Dashboard", cat: "Software", type: "One-time", price: "$599.00", status: "Active", sold: 26, revenue: "$15,600" },
];

export default function ProductsDashboard() {
  return (
    <div className="space-y-4">
      <PageHeader title="Products & Services" subtitle="Catalog of products, plans and services you sell." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Package} label="Total Products" value="156" trend={10.2} />
        <KpiCard icon={CheckCircle2} label="Active Products" value="142" trend={11.5} />
        <KpiCard icon={Wrench} label="Services" value="89" trend={8.4} up={false} />
        <KpiCard icon={DollarSign} label="Total Revenue" value="$245,800" trend={16.8} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <SectionCard title="Products by Category" className="col-span-12 lg:col-span-6">
          <div className="flex items-center gap-4">
            <div className="relative h-[220px] w-[220px]">
              <ResponsiveContainer><PieChart><Pie data={cats} dataKey="v" innerRadius={70} outerRadius={100} paddingAngle={2}>
                {cats.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie></PieChart></ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center"><div className="text-2xl font-bold">156</div></div>
              </div>
            </div>
            <ul className="flex-1 space-y-1.5 text-xs">
              {cats.map((s) => (<li key={s.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /><span className="flex-1">{s.name}</span><span className="text-muted-foreground">{s.v}%</span>
              </li>))}
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="Top Products by Revenue" className="col-span-12 lg:col-span-6" right={
          <select className="bg-card border border-border rounded px-2 py-1 text-xs"><option>This Month</option></select>
        }>
          <ul className="space-y-3">
            {top.map((t, i) => (
              <li key={t.p} className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-md gradient-orange grid place-items-center text-xs font-bold text-white">{i + 1}</span>
                <span className="flex-1 text-sm">{t.p}</span>
                <span className="text-sm font-semibold">{t.v}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <DataSection
        config={{
          entity: "Product",
          entityPlural: "Products",
          titleKey: "p",
          subtitleKey: "cat",
          kanban: { statusKey: "status", stages: ["Active", "Inactive"] },
          columns: [
            { key: "p", label: "Product Name" },
            { key: "cat", label: "Category", kind: "select", options: ["Software", "Hardware", "Services", "Subscription", "Others"] },
            { key: "type", label: "Type", kind: "select", options: ["Subscription", "One-time"] },
            { key: "price", label: "Price", kind: "currency" },
            { key: "status", label: "Status", kind: "status" },
            { key: "sold", label: "Sold", kind: "number" },
            { key: "revenue", label: "Revenue", kind: "currency" },
          ],
          rows,
        }}
      />
    </div>
  );
}