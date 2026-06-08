import { useState, useRef } from "react";
import { Briefcase, GripVertical, Star, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useUpdateDeal } from "@/lib/api/deals";
import { useUpdateClient } from "@/lib/api/clients";
import { toast } from "sonner";

type Row = {
  _id: string;
  name?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  client?: { name?: string };
  status?: string;
  stage?: string;
  value?: number;
  amount?: number;
  [k: string]: any;
};

const LEAD_STAGES = ['New', 'Contacted', 'Qualified', 'Converted'];
const DEAL_STAGES = ['New', 'Contacted', 'Proposal', 'Won'];

function EmptyState({ icon: Icon, label, hint }: { icon: LucideIcon; label: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
      <span className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card/40">
        <Icon className="h-5 w-5 opacity-60" />
      </span>
      <div className="text-sm font-medium">{label}</div>
      {hint && <div className="text-xs opacity-80">{hint}</div>}
    </div>
  );
}

export function KanbanBoard({
  rows, type, onCreate, statusKey,
}: { rows: Row[]; type: 'leads' | 'deals'; onCreate?: (stage: string) => void; statusKey?: string }) {
  const stages = type === 'leads' ? LEAD_STAGES : DEAL_STAGES;
  const effectiveStatusKey = statusKey || (type === 'leads' ? 'leadStatus' : 'stage');
  const updateDeal = useUpdateDeal();
  const updateClient = useUpdateClient();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<string | null>(null);
  const dragCounter = useRef<Record<string, number>>({});

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.setData('text/plain', id);
  }

  function handleDragOver(e: React.DragEvent, stage: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (hoverStage !== stage) setHoverStage(stage);
  }

  function handleDragEnter(e: React.DragEvent, stage: string) {
    e.preventDefault();
    dragCounter.current[stage] = (dragCounter.current[stage] || 0) + 1;
    if (hoverStage !== stage) setHoverStage(stage);
  }

  function handleDragLeave(e: React.DragEvent, stage: string) {
    dragCounter.current[stage] = (dragCounter.current[stage] || 0) - 1;
    if ((dragCounter.current[stage] || 0) <= 0) {
      dragCounter.current[stage] = 0;
      if (hoverStage === stage) setHoverStage(null);
    }
  }

  async function handleDrop(e: React.DragEvent, targetStage: string) {
    e.preventDefault();
    dragCounter.current[targetStage] = 0;
    setHoverStage(null);
    const id = e.dataTransfer.getData('text/plain') || draggingId;
    if (!id) return;
    setDraggingId(null);

    const current = rows.find((r) => r._id === id);
    const currentStage = (current?.[effectiveStatusKey] || '').toString();
    if (currentStage.toLowerCase() === targetStage.toLowerCase()) return;

    try {
      if (type === 'deals') {
        await updateDeal.mutateAsync({ id, data: { stage: targetStage } });
      } else {
        await updateClient.mutateAsync({ id, data: { [effectiveStatusKey]: targetStage } });
      }
      toast.success(`Moved to ${targetStage}`, { description: current?.firstName ? `${current.firstName} ${current.lastName || ''}`.trim() : current?.name || current?.title || '—' });
    } catch (err: any) {
      toast.error('Could not move item', { description: err.message });
    }
  }

  function handleDragEnd() {
    setDraggingId(null);
    setHoverStage(null);
    Object.keys(dragCounter.current).forEach((k) => (dragCounter.current[k] = 0));
  }

  const Icon = type === 'leads' ? Star : Briefcase;
  const totalCount = rows.length;
  const fmtValue = (n: number) => n ? `$${n.toLocaleString()}` : '';

  return (
    <div>
      {totalCount === 0 ? (
        <EmptyState icon={Icon} label={`No ${type} yet`} hint="Create your first record to populate the board." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-4">
          {stages.map((stage) => {
            const items = rows.filter((r) => (r[effectiveStatusKey] || '').toString().toLowerCase() === stage.toLowerCase());
            return (
              <div
                key={stage}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragEnter={(e) => handleDragEnter(e, stage)}
                onDragLeave={(e) => handleDragLeave(e, stage)}
                onDrop={(e) => handleDrop(e, stage)}
                className={`rounded-lg border p-3 transition-colors min-h-[200px] ${hoverStage === stage ? 'border-orange-500 bg-orange-500/5' : 'border-border bg-card/30'}`}
              >
                <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${hoverStage === stage ? 'bg-orange-500' : 'bg-muted-foreground'}`} />
                    {stage}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="rounded bg-white/10 px-2 text-xs">{items.length}</span>
                    {onCreate && (
                      <button
                        onClick={() => onCreate(stage)}
                        className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                        title={`Add to ${stage}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <div className="rounded border border-dashed border-border/50 py-6 text-center text-xs text-muted-foreground">
                      Drop here
                    </div>
                  )}
                  {items.map((r) => (
                    <div
                      key={r._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, r._id)}
                      onDragEnd={handleDragEnd}
                      className={`group cursor-grab rounded border bg-background/40 p-3 text-sm transition-all hover:border-orange-500/40 hover:shadow-md active:cursor-grabbing ${
                        draggingId === r._id ? 'border-orange-500/40 shadow-md' : 'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium leading-snug">
                          {r.firstName ? `${r.firstName} ${r.lastName || ''}`.trim() : r.name || r.title || '—'}
                        </div>
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground truncate">{r.company || r.client?.name || '—'}</div>
                      {type === 'deals' && r.value ? (
                        <div className="mt-2 text-xs font-semibold text-orange-400">{fmtValue(Number(r.value || r.amount || 0))}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
