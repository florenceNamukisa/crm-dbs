import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { KpiCard, PageHeader, SectionCard, TableToolbar, Pagination, RowActions, StatusPill, action } from "./parts";
import type { ChangeEvent } from "react";
import type { LucideIcon } from "lucide-react";

export type Column = {
  key: string;
  label: string;
  kind?: "text" | "status" | "currency" | "date" | "email" | "phone" | "number" | "longtext" | "select";
  options?: string[];
};

export type EntityConfig = {
  entity: string;            // "Lead"
  entityPlural: string;      // "Leads"
  subtitle: string;
  kpis: Array<{ icon: LucideIcon; label: string; value: string; trend: number; up?: boolean }>;
  columns: Column[];
  rows: EntityRow[];
  titleKey: string;
  subtitleKey?: string;
  kanban?: { statusKey: string; stages: string[] };
  detailExtras?: { label: string; value: string }[];
};

type EntityValue = string | number | null | undefined;
type EntityRow = Record<string, EntityValue>;

export function DataSection({ config, title }: { config: Omit<EntityConfig, "kpis" | "subtitle">; title?: string }) {
  const [items, setItems] = useState<EntityRow[]>(config.rows);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [openNew, setOpenNew] = useState(false);
  const [selected, setSelected] = useState<EntityRow | null>(null);
  const [form, setForm] = useState<EntityRow>({});

  const resetForm = () => {
    const base: EntityRow = {};
    config.columns.forEach((c) => (base[c.key] = ""));
    if (config.kanban) base[config.kanban.statusKey] = config.kanban.stages[0];
    setForm(base);
  };

  const openCreate = () => {
    resetForm();
    setOpenNew(true);
  };

  const saveNew = () => {
    const required = config.columns[0];
    if (!form[required.key]) {
      toast.error("Required field missing", { description: `${required.label} is required.` });
      return;
    }
    setItems((prev) => [{ ...form }, ...prev]);
    setOpenNew(false);
    toast.success(`${config.entity} created`, { description: `${form[required.key]} added successfully.` });
  };

  const grouped = useMemo(() => {
    if (!config.kanban) return {} as Record<string, EntityRow[]>;
    const g: Record<string, EntityRow[]> = {};
    config.kanban.stages.forEach((s) => (g[s] = []));
    items.forEach((r) => {
      const s = String(r[config.kanban!.statusKey] || config.kanban!.stages[0]);
      if (!g[s]) g[s] = [];
      g[s].push(r);
    });
    return g;
  }, [items, config]);

  return (
    <>
      <SectionCard title={title || `${config.entityPlural} ${view === "list" ? "List" : "Board"}`}>
        <TableToolbar
          entity={config.entityPlural}
          onNew={openCreate}
          onImport={action(`${config.entityPlural} imported`)}
          onExport={action(`${config.entityPlural} exported`)}
          view={view}
          onView={config.kanban ? setView : undefined}
        />

        {view === "list" ? (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-left">
                  {config.columns.map((c) => (
                    <th key={c.key} className="font-normal pb-2 pr-3 whitespace-nowrap">{c.label}</th>
                  ))}
                  <th className="font-normal pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, idx) => (
                  <tr key={idx} onClick={() => setSelected(r)} className="border-t border-border/50 hover:bg-accent/30 cursor-pointer">
                    {config.columns.map((c, ci) => (
                      <td key={c.key} className={"py-2 pr-3 " + (ci === 0 ? "font-medium" : "text-muted-foreground")}>
                        {c.kind === "status" ? <StatusPill value={String(r[c.key] ?? "")} /> : String(r[c.key] ?? "—")}
                      </td>
                    ))}
                    <td onClick={(e) => e.stopPropagation()}><RowActions /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex gap-3 min-w-max pb-2">
              {config.kanban!.stages.map((stage) => (
                <div key={stage} className="w-72 shrink-0 bg-card/40 border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full gradient-orange" />
                      <h4 className="text-sm font-semibold text-gradient-orange">{stage}</h4>
                      <span className="text-[10px] text-muted-foreground">({grouped[stage]?.length || 0})</span>
                    </div>
                    <button onClick={openCreate} className="text-xs text-orange-400 hover:underline">+ Add</button>
                  </div>
                  <div className="space-y-2">
                    {(grouped[stage] || []).map((r, i) => (
                      <div key={i} onClick={() => setSelected(r)} className="glass-card rounded-md p-3 cursor-pointer hover:border-orange-500/40 transition">
                        <div className="text-sm font-medium">{r[config.titleKey]}</div>
                        {config.subtitleKey && (
                          <div className="text-xs text-muted-foreground mt-0.5">{r[config.subtitleKey]}</div>
                        )}
                        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>#{(i + 1).toString().padStart(4, "0")}</span>
                          <StatusPill value={stage} />
                        </div>
                      </div>
                    ))}
                    {(grouped[stage] || []).length === 0 && (
                      <div className="text-center text-xs text-muted-foreground py-6 border border-dashed border-border rounded-md">
                        No items
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "list" && <Pagination total={items.length} perPage={Math.min(5, items.length)} totalPages={Math.max(1, Math.ceil(items.length / 5))} />}
      </SectionCard>

      {/* Create dialog */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-gradient-orange">New {config.entity}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {config.columns.map((c) => (
              <div key={c.key} className={c.kind === "longtext" ? "col-span-2" : "col-span-1"}>
                <Label className="text-xs">{c.label}</Label>
                {c.kind === "longtext" ? (
                  <Textarea value={form[c.key] || ""} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, [c.key]: e.target.value })} placeholder={c.label} />
                ) : c.kind === "status" || c.kind === "select" ? (
                  <select
                    value={form[c.key] || ""}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm({ ...form, [c.key]: e.target.value })}
                    className="w-full h-9 rounded-md border border-border bg-card px-2 text-sm"
                  >
                    <option value="">Select…</option>
                    {(c.options || config.kanban?.stages || []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <Input
                    type={c.kind === "number" ? "number" : c.kind === "date" ? "date" : c.kind === "email" ? "email" : "text"}
                    value={form[c.key] || ""}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [c.key]: e.target.value })}
                    placeholder={c.label}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <button onClick={() => setOpenNew(false)} className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">Cancel</button>
            <button onClick={saveNew} className="px-4 py-1.5 text-sm gradient-orange text-white rounded-md font-medium shadow">Save {config.entity}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={(o: boolean) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-gradient-orange text-xl">{selected?.[config.titleKey]}</SheetTitle>
            {config.subtitleKey && <SheetDescription>{selected?.[config.subtitleKey]}</SheetDescription>}
          </SheetHeader>
          {selected && (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {config.columns.map((c) => (
                  <div key={c.key} className="glass-card rounded-md p-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.label}</div>
                    <div className="text-sm mt-1">
                      {c.kind === "status" ? <StatusPill value={String(selected[c.key] ?? "")} /> : String(selected[c.key] ?? "—")}
                    </div>
                  </div>
                ))}
              </div>
              {config.detailExtras && (
                <div className="space-y-2">
                  {config.detailExtras.map((e) => (
                    <div key={e.label} className="glass-card rounded-md p-3">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{e.label}</div>
                      <div className="text-sm mt-1">{e.value}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={action(`${config.entity} updated`)} className="flex-1 px-3 py-2 text-sm gradient-orange text-white rounded-md font-medium">Edit</button>
                <button onClick={action("Email sent")} className="flex-1 px-3 py-2 text-sm border border-border rounded-md hover:bg-accent">Email</button>
                <button
                  onClick={() => {
                    setItems((prev) => prev.filter((x) => x !== selected));
                    setSelected(null);
                    toast.success(`${config.entity} deleted`);
                  }}
                  className="px-3 py-2 text-sm border border-red-500/40 text-red-400 rounded-md hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export default function EntityDashboard({ config }: { config: EntityConfig }) {
  return (
    <div className="space-y-4">
      <PageHeader title={config.entityPlural} subtitle={config.subtitle} />
      {config.kpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {config.kpis.map((k) => (
            <KpiCard key={k.label} icon={k.icon} label={k.label} value={k.value} trend={k.trend} up={k.up} />
          ))}
        </div>
      )}
      <DataSection config={config} />
    </div>
  );
}
