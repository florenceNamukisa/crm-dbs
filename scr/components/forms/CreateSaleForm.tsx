import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

interface CreateSaleFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateSaleForm({ onClose, onSuccess }: CreateSaleFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const saleForm = useForm();
  const queryClient = useQueryClient();

  const onSubmit = async (vals: any) => {
    setIsLoading(true);
    try {
      await apiFetch("/deals", {
        method: "POST",
        body: JSON.stringify({
          n: vals.clientName,
          amt: vals.saleAmount,
          stage: vals.stage,
          type: vals.type,
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

  return (
    <form onSubmit={saleForm.handleSubmit(onSubmit)} className="space-y-3 mt-2">
      <div>
        <label className="text-xs font-medium">Client / Deal Name *</label>
        <Input {...saleForm.register("clientName", { required: true })} placeholder="Deal name" />
      </div>
      <div>
        <label className="text-xs font-medium">Sale Amount</label>
        <Input {...saleForm.register("saleAmount")} placeholder="$10,000" />
      </div>
      <div>
        <label className="text-xs font-medium">Stage *</label>
        <select {...saleForm.register("stage", { required: true })} className="w-full rounded-md border px-2 py-1 text-sm">
          <option value="">Select stage</option>
          <option>Contacted</option>
          <option>Proposal</option>
          <option>Negotiations</option>
          <option>Closed</option>
          <option>Lost</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium">Type</label>
        <select {...saleForm.register("type")} className="w-full rounded-md border px-2 py-1 text-sm">
          <option>Existing</option>
          <option>New</option>
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
