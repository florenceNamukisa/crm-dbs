import { useState } from "react";
import { ArrowUp, ArrowDown, Filter, Columns3, Plus, Download, Upload, ChevronLeft, ChevronRight, Search, MoreHorizontal, LayoutGrid, List, Phone, Mail, MessageSquare, Edit, Calendar, CheckSquare, Forward } from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export const action = (label: string) => () => toast.success(label, { description: "Action triggered successfully." });

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
      <div className="min-w-0">
        <h2 className="text-xl md:text-2xl font-bold text-gradient-orange break-words">{title}</h2>
        {subtitle && <p className="text-xs md:text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
}

export function KpiCard({ icon: Icon, label, value, trend, up = true }: { icon: LucideIcon; label: string; value: string; trend: number; up?: boolean }) {
  return (
    <div className="glass-card rounded-xl p-3 md:p-4">
      <div className="icon-tile h-9 w-9 md:h-10 md:w-10 rounded-lg grid place-items-center">
        <Icon className="h-4 w-4 md:h-5 md:w-5 text-orange-400" />
      </div>
      <div className="mt-2 md:mt-3 text-[10px] md:text-xs text-muted-foreground">{label}</div>
      <div className="text-lg md:text-2xl font-bold mt-0.5 break-all">{value}</div>
      <div className={"text-[10px] md:text-[11px] mt-1 flex items-center gap-1 " + (up ? "text-emerald-400" : "text-red-400")}>
        {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        {trend}% <span className="text-muted-foreground hidden sm:inline">vs last month</span>
      </div>
    </div>
  );
}

export function SectionCard({ title, right, children, className = "" }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={"glass-card rounded-xl p-3 md:p-4 " + className}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="font-semibold text-gradient-orange text-sm md:text-base">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

export function TableToolbar({
  entity,
  onNew,
  onImport,
  onExport,
  onExportMenu,
  search,
  onSearch,
  view,
  onView,
  hideFilter = false,
  hideColumns = false,
}: {
  entity: string;
  onNew: () => void;
  onImport: () => void;
  onExport: () => void;
  onExportMenu?: (format: "csv" | "xlsx" | "pdf") => void;
  search?: string;
  onSearch?: (v: string) => void;
  view?: "list" | "kanban";
  onView?: (v: "list" | "kanban") => void;
  hideFilter?: boolean;
  hideColumns?: boolean;
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="flex flex-col gap-2 mb-3">
      <div className="flex flex-wrap items-center gap-2">
        {search !== undefined && onSearch && (
          <div className="relative flex-1 min-w-[140px] max-w-md order-first w-full sm:w-auto sm:order-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={`Search ${entity}...`}
              className="w-full h-9 pl-9 pr-3 rounded-md bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        )}
        {/* Mobile filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="sm:hidden flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-accent"
        >
          <Filter className="h-3.5 w-3.5" /> More
        </button>
        {/* Desktop filter actions */}
        <div className={"hidden sm:flex items-center gap-2 " + (showFilters ? "flex" : "")}>
          {!hideFilter && (
            <button onClick={action("Filter applied")} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-accent">
              <Filter className="h-3.5 w-3.5" /> Filter
            </button>
          )}
          {!hideColumns && (
            <button onClick={action("Columns updated")} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-accent">
              <Columns3 className="h-3.5 w-3.5" /> Columns
            </button>
          )}
          {onView && (
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              <button onClick={() => onView("list")} className={"px-2 py-1.5 text-xs flex items-center gap-1 " + (view === "list" ? "gradient-orange text-white" : "hover:bg-accent")}>
                <List className="h-3.5 w-3.5" /> List
              </button>
              <button onClick={() => onView("kanban")} className={"px-2 py-1.5 text-xs flex items-center gap-1 " + (view === "kanban" ? "gradient-orange text-white" : "hover:bg-accent")}>
                <LayoutGrid className="h-3.5 w-3.5" /> Kanban
              </button>
            </div>
          )}
        </div>
        {/* Mobile expanded filter actions */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:hidden">
            {!hideFilter && (
              <button onClick={action("Filter applied")} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-accent">
                <Filter className="h-3.5 w-3.5" /> Filter
              </button>
            )}
            {!hideColumns && (
              <button onClick={action("Columns updated")} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-accent">
                <Columns3 className="h-3.5 w-3.5" /> Columns
              </button>
            )}
            {onView && (
              <div className="flex items-center border border-border rounded-md overflow-hidden">
                <button onClick={() => onView("list")} className={"px-2 py-1.5 text-xs flex items-center gap-1 " + (view === "list" ? "gradient-orange text-white" : "hover:bg-accent")}>
                  <List className="h-3.5 w-3.5" /> List
                </button>
                <button onClick={() => onView("kanban")} className={"px-2 py-1.5 text-xs flex items-center gap-1 " + (view === "kanban" ? "gradient-orange text-white" : "hover:bg-accent")}>
                  <LayoutGrid className="h-3.5 w-3.5" /> Kanban
                </button>
              </div>
            )}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button onClick={onImport} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-accent">
            <Upload className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Import</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-accent"
            >
              <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export</span>
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[140px] py-1">
<button
                   onClick={() => { if (onExportMenu) { onExportMenu("csv"); } else { onExport(); } setShowExportMenu(false); }}
                   className="w-full text-left px-4 py-2 text-xs hover:bg-accent"
                 >
                   Export as CSV
                 </button>
                 <button
                   onClick={() => { if (onExportMenu) { onExportMenu("xlsx"); } else { onExport(); } setShowExportMenu(false); }}
                   className="w-full text-left px-4 py-2 text-xs hover:bg-accent"
                 >
                   Export as Excel
                 </button>
                 <button
                   onClick={() => { if (onExportMenu) { onExportMenu("pdf"); } else { onExport(); } setShowExportMenu(false); }}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-accent"
                >
                  Export as PDF
                </button>
                </div>
              </>
            )}
          </div>
          <button onClick={onNew} className="flex items-center gap-1.5 px-3 py-1.5 text-xs gradient-orange text-white rounded-md font-medium shadow whitespace-nowrap">
            <Plus className="h-3.5 w-3.5" /> <span className="hidden xs:inline">New </span>{entity.replace(/s$/, "")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Pagination({ total, perPage = 5, totalPages }: { total: number; perPage?: number; totalPages: number }) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs mt-3 text-muted-foreground">
      <span className="text-[10px] sm:text-xs">Showing 1 to {perPage} of {total.toLocaleString()}</span>
      <div className="flex items-center gap-1">
        <button onClick={action("Previous page")} className="h-7 w-7 grid place-items-center border border-border rounded hover:bg-accent"><ChevronLeft className="h-3.5 w-3.5" /></button>
        {[1, 2, 3].map((n) => (
          <button key={n} onClick={action(`Page ${n}`)} className={"h-7 min-w-7 px-1.5 sm:px-2 rounded text-xs " + (n === 1 ? "gradient-orange text-white" : "border border-border hover:bg-accent")}>{n}</button>
        ))}
        {totalPages > 3 && <span className="px-1">…</span>}
        {totalPages > 3 && (
          <button onClick={action(`Page ${totalPages}`)} className="h-7 min-w-7 px-1.5 sm:px-2 border border-border rounded hover:bg-accent">{totalPages}</button>
        )}
        <button onClick={action("Next page")} className="h-7 w-7 grid place-items-center border border-border rounded hover:bg-accent"><ChevronRight className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

export function SearchBar({ placeholder, value, onChange }: { placeholder: string; value?: string; onChange?: (v: string) => void }) {
  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <input
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-3 rounded-md bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
      />
    </div>
  );
}

export function RowActions({ onAction }: { onAction?: (action: string) => void }) {
  const actions = [
    { key: "change_status", label: "Status", icon: Edit, color: "text-orange-400" },
    { key: "call", label: "Call", icon: Phone, color: "text-green-400" },
    { key: "email", label: "Email", icon: Mail, color: "text-blue-400" },
    { key: "whatsapp", label: "WhatsApp", icon: MessageSquare, color: "text-emerald-400" },
    { key: "notes", label: "Notes", icon: Edit, color: "text-yellow-400" },
    { key: "task", label: "Task", icon: CheckSquare, color: "text-purple-400" },
    { key: "event", label: "Event", icon: Calendar, color: "text-red-400" },
    { key: "forward", label: "Forward", icon: Forward, color: "text-cyan-400" },
  ];
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="h-7 w-7 grid place-items-center rounded hover:bg-accent">
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-xl p-1.5 flex gap-1 flex-nowrap" onClick={(e) => e.stopPropagation()}>
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.key}
                  onClick={(e) => { e.stopPropagation(); onAction?.(a.key); setOpen(false); }}
                  className={`h-8 w-8 rounded-md grid place-items-center hover:bg-accent ${a.color}`}
                  title={a.label}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function StatusPill({ value }: { value: string }) {
  const map: Record<string, string> = {
    New: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    Contacted: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    Qualified: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    Unqualified: "bg-red-500/15 text-red-400 border-red-500/30",
    Active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    Inactive: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    Hot: "bg-red-500/15 text-red-400 border-red-500/30",
    Warm: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    Cold: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    Proposal: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    Negotiation: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Contracted: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    "In Progress": "bg-blue-500/15 text-blue-400 border-blue-500/30",
    Completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    "New Task": "bg-purple-500/15 text-purple-400 border-purple-500/30",
    "Almost Due": "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Due: "bg-red-500/15 text-red-400 border-red-500/30",
    pending: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    in_progress: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    waiting: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    deferred: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };
  return <span className={"text-[10px] px-2 py-0.5 rounded border whitespace-nowrap " + (map[value] || "border-border text-muted-foreground")}>{value}</span>;
}