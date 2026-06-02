import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Briefcase, Building2, Contact2, Package, FileText, Receipt, FileBarChart,
  CheckSquare, Calendar, PhoneCall, CalendarDays, Repeat,
  Inbox, Mail, MessageCircle, MessageSquare, PhoneIncoming,
  BarChart3, GitBranch, Trophy, Activity,
  Folder, StickyNote, Bot,
  Bell, Search, Plus, HelpCircle, Calendar as CalIcon,
  ShieldCheck, Settings, Globe, LogOut,
} from "lucide-react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { clearSession, getStoredUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { FormProvider, useFormDialog } from "@/hooks/useFormDialog";
import { FormModals } from "@/components/forms/FormModals";

type NavItem = { label: string; to: string; icon: LucideIcon; badge?: string };
type NavGroup = { title?: string; items: NavItem[] };

const NAV: NavGroup[] = [
  { items: [{ label: "Dashboard", to: "/", icon: LayoutDashboard }] },
  { title: "Sales", items: [
    { label: "Leads", to: "/leads", icon: Users },
    { label: "Deals", to: "/deals", icon: Briefcase },
    { label: "Clients", to: "/clients", icon: Building2 },
    { label: "Contacts", to: "/contacts", icon: Contact2 },
    { label: "Products & Services", to: "/products", icon: Package },
    { label: "Proposals", to: "/proposals", icon: FileText },
    { label: "Quotes", to: "/quotes", icon: Receipt },
    { label: "Invoices", to: "/invoices", icon: FileBarChart },
  ]},
  { title: "Activities", items: [
    { label: "Tasks", to: "/tasks", icon: CheckSquare },
    { label: "Calendar", to: "/calendar", icon: Calendar },
    { label: "Calls", to: "/calls", icon: PhoneCall },
    { label: "Meetings", to: "/meetings", icon: CalendarDays },
    { label: "Follow-ups", to: "/followups", icon: Repeat },
  ]},
  { title: "Communication", items: [
    { label: "Inbox", to: "/inbox", icon: Inbox, badge: "12" },
    { label: "Email", to: "/email", icon: Mail },
    { label: "WhatsApp", to: "/whatsapp", icon: MessageCircle },
    { label: "SMS", to: "/sms", icon: MessageSquare },
    { label: "Call Logs", to: "/call-logs", icon: PhoneIncoming },
  ]},
  { title: "Reports", items: [
    { label: "My Reports", to: "/reports", icon: BarChart3 },
    { label: "Pipeline Report", to: "/reports/pipeline", icon: GitBranch },
    { label: "Sales Performance", to: "/reports/performance", icon: Trophy },
    { label: "Activity Report", to: "/reports/activity", icon: Activity },
  ]},
  { title: "Tools", items: [
    { label: "Documents", to: "/documents", icon: Folder },
    { label: "Notes", to: "/notes", icon: StickyNote },
    { label: "AI Sales Assistant", to: "/ai-assistant", icon: Bot },
  ]},
  { title: "Admin", items: [
    { label: "Super Admin", to: "/super-admin", icon: Globe },
    { label: "Tenant Admin", to: "/tenant-admin", icon: ShieldCheck },
    { label: "Settings", to: "/settings", icon: Settings },
  ]},
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = getStoredUser();
  const initials = (user?.name || "CRM")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const visibleNav = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.to === "/super-admin") return user?.role === "superadmin";
      if (item.to === "/tenant-admin") return user?.role === "superadmin" || user?.role === "tenant_admin";
      return true;
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <FormProvider>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
          {user?.tenantId ? (
            <img
              src={user?.tenantLogo ?? `/uploads/tenants/default.png`}
              alt="Logo"
              className="h-10 w-10 rounded-xl object-cover shadow-lg"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="h-10 w-10 rounded-xl gradient-orange grid place-items-center text-white font-bold shadow-lg">C</div>
          )}
          <div>
            <div className="font-bold text-lg leading-none">CRM</div>
            <div className="text-[10px] tracking-widest text-muted-foreground mt-1">SALES AGENT</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {visibleNav.map((group, gi) => (
            <div key={gi}>
              {group.title && (
                <div className="px-3 py-1 text-[10px] font-semibold tracking-widest text-muted-foreground">
                  {group.title}
                </div>
              )}
              <ul className="space-y-0.5">
                {group.items.map((it) => {
                  const active = pathname === it.to;
                  const Icon = it.icon;
                  return (
                    <li key={it.to}>
                      <Link
                        to={it.to}
                        className={
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all " +
                          (active
                            ? "gradient-orange text-white shadow-md shadow-orange-900/30 font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent")
                        }
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{it.label}</span>
                        {it.badge && (
                          <span className="text-[10px] gradient-orange text-white rounded-full px-1.5 py-0.5">{it.badge}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-700 grid place-items-center text-white font-semibold">{initials}</div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-sidebar"></span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.name ?? "CRM User"}</div>
            <div className="text-xs text-muted-foreground">{user?.tenantName ?? user?.role ?? "Workspace"}</div>
          </div>
          <button
            onClick={() => {
              clearSession();
              window.location.href = "/login";
            }}
            className="grid h-9 w-9 place-items-center rounded-md border border-border hover:bg-accent"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
    <FormModals />
    </FormProvider>
  );
}

function TopBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { setOpenForm } = useFormDialog();
  const showWelcome = pathname === "/";
  const firstName = getStoredUser()?.name?.split(" ")[0] ?? "there";

  const handleAddNew = () => {
    if (pathname.includes("/leads")) setOpenForm("lead");
    else if (pathname.includes("/deals")) setOpenForm("sale");
    else if (pathname.includes("/clients")) setOpenForm("client");
    else if (pathname.includes("/contacts")) setOpenForm("contact");
    else if (pathname.includes("/tasks")) setOpenForm("task");
    else toast.success("Add New", { description: "Navigate to a section to add new items." });
  };
  return (
    <header className="h-16 border-b border-border bg-background/60 backdrop-blur px-6 flex items-center gap-3 sticky top-0 z-30">
      {showWelcome && (
        <div className="min-w-0 mr-auto">
          <h1 className="text-lg font-bold whitespace-nowrap">Welcome back, {firstName}</h1>
        </div>
      )}
      <div className={"relative " + (showWelcome ? "w-[360px]" : "flex-1 max-w-xl")}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search leads, deals, contacts, clients..."
          className="w-full h-10 pl-10 pr-16 rounded-lg bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">Ctrl+K</kbd>
      </div>
      <button onClick={() => toast("15 new notifications")} className="relative h-10 w-10 grid place-items-center rounded-lg bg-card border border-border hover:bg-accent">
        <Bell className="h-4 w-4" />
        <span className="absolute -top-1 -right-1 text-[10px] gradient-orange text-white rounded-full px-1.5">15</span>
      </button>
      <button onClick={() => toast("8 unread emails")} className="relative h-10 w-10 grid place-items-center rounded-lg bg-card border border-border hover:bg-accent">
        <Mail className="h-4 w-4" />
        <span className="absolute -top-1 -right-1 text-[10px] gradient-orange text-white rounded-full px-1.5">8</span>
      </button>
      <button onClick={() => toast("4 new messages")} className="relative h-10 w-10 grid place-items-center rounded-lg bg-card border border-border hover:bg-accent">
        <MessageCircle className="h-4 w-4" />
        <span className="absolute -top-1 -right-1 text-[10px] gradient-orange text-white rounded-full px-1.5">4</span>
      </button>
      <button onClick={() => toast("Help center opening...")} className="h-10 w-10 grid place-items-center rounded-lg bg-card border border-border hover:bg-accent">
        <HelpCircle className="h-4 w-4" />
      </button>
      <ThemeToggle className="h-10 w-10 rounded-lg" />
      <div className="h-10 px-3 flex items-center gap-2 rounded-lg bg-card border border-border text-sm">
        <CalIcon className="h-4 w-4 text-muted-foreground" />
        May 01 - May 31, 2025
      </div>
      <button onClick={handleAddNew} className="h-10 px-4 gradient-orange text-white rounded-lg flex items-center gap-2 font-medium shadow-lg hover:opacity-90">
        <Plus className="h-4 w-4" /> Add New
      </button>
    </header>
  );
}
