import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useClients } from "@/lib/api/clients";

interface CreateSaleFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateSaleForm({ onClose, onSuccess }: CreateSaleFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const saleForm = useForm();
  const queryClient = useQueryClient();
  const { data: clientsData } = useClients();

  const onSubmit = async (vals: any) => {
    setIsLoading(true);
    try {
      await apiFetch("/deals", {
        method: "POST",
        body: JSON.stringify({
          title: vals.title,
          value: parseFloat(vals.value) || 0,
          client: vals.client,
          stage: vals.stage || "lead",
          dealType: vals.dealType === "existing" ? "existing" : "new",
        }),
      });
      saleForm.reset();
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard"] as unknown as readonly unknown[] });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to create sale");
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
        <Input type="number" {...saleForm.register("value", { required: true })} placeholder="25000000" />
      </div>
      <div>
        <label className="text-xs font-medium">Client *</label>
        <select {...saleForm.register("client", { required: true })} className="w-full rounded-md border px-2 py-1 text-sm" disabled={isLoading}>
          <option value="">Select client</option>
          {clients.map((c: any) => (
            <option key={c._id} value={c._id}>{c.name} {c.company && `- ${c.company}`}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium">Stage *</label>
        <select {...saleForm.register("stage", { required: true })} className="w-full rounded-md border px-2 py-1 text-sm">
          <option value="lead">Lead</option>
          <option value="qualification">Qualification</option>
          <option value="proposal">Proposal</option>
          <option value="negotiation">Negotiation</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium">Deal Type</label>
        <select {...saleForm.register("dealType")} className="w-full rounded-md border px-2 py-1 text-sm">
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