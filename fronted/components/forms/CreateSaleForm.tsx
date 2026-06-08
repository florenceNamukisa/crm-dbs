import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useClients } from "@/lib/api/clients";

interface CreateSaleFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

// Deal-model stages (matches the backend Deal enum and the admin dashboard)
const DEAL_STAGES = [
  { value: "lead", label: "Lead" },
  { value: "qualification", label: "Qualification" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
];

export function CreateSaleForm({ onClose, onSuccess }: CreateSaleFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const saleForm = useForm();
  const queryClient = useQueryClient();
  const { data: clientsData } = useClients();

  const onSubmit = async (vals: any) => {
    if (!vals.client) {
      toast.error("Client is required");
      return;
    }
    if (!vals.value) {
      toast.error("Value is required");
      return;
    }

    setIsLoading(true);
    try {
      // Create a Deal (the same record type the admin dashboard counts as
      // "Number of Sales" / "Value of Sales"). Posting to /deals keeps the
      // Sales Agent dashboard cards/graphs in sync with the admin.
      await fetch(`${import.meta.env.VITE_API_URL || (window.location.port !== "5000" ? "http://localhost:5000/api" : `${window.location.origin}/api`)}/deals`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${localStorage.getItem("crm.auth.token") || ""}`,
        },
        body: JSON.stringify({
          title: vals.title,
          value: parseFloat(vals.value) || 0,
          client: vals.client,
          stage: vals.stage || "lead",
          dealType: vals.dealType === "existing" ? "existing" : "new",
        }),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({ message: "Request failed" }));
          throw new Error(err.message || "Failed to create deal");
        }
      });

      // Refresh every dashboard/component that counts deals
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });

      saleForm.reset();
      toast.success("Sale created successfully");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create sale");
    } finally {
      setIsLoading(false);
    }
  };

  const clients = clientsData?.clients || [];

  return (
    <form onSubmit={saleForm.handleSubmit(onSubmit)} className="space-y-3 mt-2">
      <div>
        <label className="text-xs font-medium">Title *</label>
        <Input {...saleForm.register("title", { required: true })} placeholder="Deal title" />
      </div>
      <div>
        <label className="text-xs font-medium">Value (UGX) *</label>
        <Input
          type="number"
          {...saleForm.register("value", { required: true })}
          placeholder="25000000"
        />
      </div>
      <div>
        <label className="text-xs font-medium">Client *</label>
        <select
          {...saleForm.register("client", { required: true })}
          className="w-full rounded-md border px-2 py-1 text-sm"
          disabled={isLoading}
        >
          <option value="">Select client</option>
          {clients.map((c: any) => (
            <option key={c._id} value={c._id}>
              {c.name}
              {c.company ? ` - ${c.company}` : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium">Stage *</label>
        <select
          {...saleForm.register("stage", { required: true })}
          className="w-full rounded-md border px-2 py-1 text-sm"
        >
          {DEAL_STAGES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium">Deal Type</label>
        <select
          {...saleForm.register("dealType")}
          className="w-full rounded-md border px-2 py-1 text-sm"
        >
          <option value="new">New</option>
          <option value="existing">Existing</option>
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onClose} type="button">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="ml-auto">
          {isLoading ? "Creating..." : "Create Sale"}
        </Button>
      </div>
    </form>
  );
}
