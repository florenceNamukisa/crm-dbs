import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Bot, Sparkles } from "lucide-react";

export const Route = createFileRoute("/ai-assistant")({
  component: () => (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gradient-orange">AI Sales Assistant</h2>
          <p className="text-sm text-muted-foreground mt-1">AI-powered insights for your sales workflow</p>
        </div>
        <div className="glass-card rounded-xl p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-2xl gradient-orange grid place-items-center text-white shadow-lg shadow-orange-950/40">
            <Bot className="h-10 w-10" />
          </div>
          <h3 className="mt-6 text-xl font-bold">Coming Soon</h3>
          <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
            Our AI Sales Assistant is under development. It will provide smart prompts, 
            conversation summaries, next-best-action suggestions, and pipeline forecasting.
          </p>
          <div className="flex items-center justify-center gap-6 mt-8">
            {[
              { icon: Bot, label: "Smart Prompts" },
              { icon: Sparkles, label: "Auto Summaries" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 text-orange-400" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  ),
});