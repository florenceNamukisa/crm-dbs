import { AppShell } from "./AppShell";

export function PageStub({ title, description }: { title: string; description?: string }) {
  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gradient-orange">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className="glass-card rounded-xl p-10 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl gradient-orange grid place-items-center text-white text-2xl font-bold shadow-lg">⚡</div>
          <h3 className="mt-4 text-lg font-semibold">{title} module</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            This module is wired into the navigation and theme. Tell me to build out this page next and
            I'll generate the full UI, tables, filters, and workflows for it.
          </p>
        </div>
      </div>
    </AppShell>
  );
}