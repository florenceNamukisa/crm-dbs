import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Briefcase, Building2,
  CheckSquare, Calendar, Repeat,
  StickyNote, Bot, FileBarChart,
  Search, Plus, Calendar as CalIcon,
  ShieldCheck, Settings, Globe, LogOut,
  Menu, X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
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
    { label: "Sales", to: "/sales", icon: Briefcase },
    { label: "Clients", to: "/clients", icon: Building2 },
  ]},
  { title: "Activities", items: [
    { label: "Tasks", to: "/tasks", icon: CheckSquare },
    { label: "Schedules", to: "/calendar", icon: Calendar },
    { label: "Follow-ups", to: "/followups", icon: Repeat },
  ]},
  { title: "Tools", items: [
    { label: "Notes", to: "/notes", icon: StickyNote },
    { label: "AI Sales Assistant", to: "/ai-assistant", icon: Bot },
  ]},
  { title: "Admin", items: [
    { label: "Super Admin", to: "/super-admin", icon: Globe },
    { label: "Tenant Admin", to: "/tenant-admin", icon: ShieldCheck },
    { label: "Reports", to: "/reports", icon: FileBarChart },
    { label: "Settings", to: "/settings", icon: Settings },
  ]},
];

function SidebarContent({ visibleNav, pathname, user, initials, onNavClick }: {
  visibleNav: NavGroup[];
  pathname: string;
  user: any;
  initials: string;
  onNavClick?: () => void;
}) {
  const navigate = useNavigate();
  return (
    <>
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        {user?.tenantId ? (
          <img
            src={user?.tenantLogo ?? `/uploads/tenants/default.png`}
            alt="Logo"
            className="h-10 w-10 rounded-xl object-cover shadow-lg shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="h-10 w-10 rounded-xl gradient-orange grid place-items-center text-white font-bold shadow-lg shrink-0">C</div>
        )}
        <div className="min-w-0">
          <div className="font-bold text-lg leading-none truncate">{user?.tenantName || "CRM"}</div>
          <div className="text-[10px] tracking-widest text-muted-foreground mt-1 truncate">{user?.role === "superadmin" ? "SUPER ADMIN" : user?.role === "tenant_admin" ? "COMPANY ADMIN" : user?.role === "sales_manager" ? "SALES MANAGER" : "SALES AGENT"}</div>
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
                const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
                const Icon = it.icon;
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      onClick={onNavClick}
                      className={
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all " +
                        (active
                          ? "gradient-orange text-white shadow-md shadow-orange-900/30 font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent")
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.badge && (
                        <span className="text-[10px] gradient-orange text-white rounded-full px-1.5 py-0.5 shrink-0">{it.badge}</span>
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
        <div className="relative shrink-0">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-700 grid place-items-center text-white font-semibold">{initials}</div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-sidebar"></span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{user?.name ?? "CRM User"}</div>
          <div className="text-xs text-muted-foreground truncate">{user?.tenantName ?? user?.role ?? "Workspace"}</div>
        </div>
        <button
          onClick={() => {
            clearSession();
            void navigate({ to: "/login", replace: true });
          }}
          className="grid h-9 w-9 place-items-center rounded-md border border-border hover:bg-accent shrink-0"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = getStoredUser();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const initials = (user?.name || "CRM")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const visibleNav = NAV.map((group) => ({
    ...group,
    items:     group.items.filter((item) => {
      if (item.to === "/super-admin") return user?.role === "superadmin";
      if (item.to === "/tenant-admin") return user?.role === "superadmin" || user?.role === "tenant_admin";
      if (item.to === "/reports") return ["superadmin", "tenant_admin", "admin", "manager", "sales_manager"].includes(user?.role || "");
      if (item.to === "/followups") return !["agent", "sales_agent"].includes(user?.role || "");
      return true;
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <FormProvider>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Desktop Sidebar - hidden on mobile */}
        <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-sidebar border-r border-sidebar-border">
          <SidebarContent visibleNav={visibleNav} pathname={pathname} user={user} initials={initials} />
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <aside className="fixed top-0 left-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border flex flex-col z-50 shadow-2xl animate-in slide-in-from-left">
              <div className="flex items-center justify-end p-2 border-b border-sidebar-border">
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-md hover:bg-sidebar-accent text-sidebar-foreground"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SidebarContent
                visibleNav={visibleNav}
                pathname={pathname}
                user={user}
                initials={initials}
                onNavClick={() => setMobileSidebarOpen(false)}
              />
            </aside>
          </div>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onMenuClick={() => setMobileSidebarOpen(true)} />
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
      <FormModals />
    </FormProvider>
  );
}

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { setOpenForm } = useFormDialog();
  const showWelcome = pathname === "/";
  const firstName = getStoredUser()?.name?.split(" ")[0] ?? "there";

  const handleAddNew = () => {
    if (pathname.includes("/leads")) setOpenForm("lead");
    else if (pathname.includes("/sales")) setOpenForm("sale");
    else if (pathname.includes("/clients")) setOpenForm("client");
    else if (pathname.includes("/contacts")) setOpenForm("contact");
    else if (pathname.includes("/tasks")) toast.info("Tasks", { description: "Create tasks from the Tasks section." });
    else toast.success("Add New", { description: "Navigate to a section to add new items." });
  };
  return (
    <header className="h-16 border-b border-border bg-background/60 backdrop-blur px-3 md:px-6 flex items-center gap-2 md:gap-3 sticky top-0 z-30">
      {/* Hamburger menu button - visible only on mobile */}
      <button
        onClick={onMenuClick}
        className="lg:hidden grid h-9 w-9 shrink-0 place-items-center rounded-md hover:bg-accent"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {showWelcome && (
        <div className="min-w-0 mr-auto hidden sm:block">
          <h1 className="text-base md:text-lg font-bold whitespace-nowrap truncate">Welcome back, {firstName}</h1>
        </div>
      )}
      <div className={"relative min-w-0 flex-1 " + (showWelcome ? "md:max-w-xs lg:max-w-sm" : "max-w-xl")}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search..."
          className="w-full h-10 pl-10 pr-10 md:pr-16 rounded-lg bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        <kbd className="hidden md:block absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">Ctrl+K</kbd>
      </div>
      <ThemeToggle className="h-9 w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
      <div className="hidden md:flex relative h-10 px-3 items-center gap-2 rounded-lg bg-card border border-border text-sm cursor-pointer hover:bg-accent transition shrink-0"
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'date';
          input.className = 'sr-only';
          document.body.appendChild(input);
          input.showPicker?.();
          input.addEventListener('change', () => {
            if (input.value) {
              const d = new Date(input.value);
              toast.info(`Selected: ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
            }
            document.body.removeChild(input);
          });
          input.click();
        }}>
        <CalIcon className="h-4 w-4 text-muted-foreground" />
        <span className="hidden lg:inline">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
      {!showWelcome && (
        <button onClick={handleAddNew} className="h-9 md:h-10 px-3 md:px-4 gradient-orange text-white rounded-lg flex items-center gap-1 md:gap-2 font-medium shadow-lg hover:opacity-90 shrink-0 text-xs md:text-sm">
          <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" /> <span className="hidden xs:inline">Add New</span>
        </button>
      )}
    </header>
  );
}