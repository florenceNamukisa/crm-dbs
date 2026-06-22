import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

interface CreateLeadFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateLeadForm({ onClose, onSuccess }: CreateLeadFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const leadForm = useForm();
  const queryClient = useQueryClient();

  const onSubmit = async (vals: any) => {
    setIsLoading(true);
    try {
      await apiFetch("/clients", {
        method: "POST",
        body: JSON.stringify({
          name: vals.contactName,
          phone: vals.telephone,
          email: vals.email,
          position: vals.position,
          company: vals.companyName,
          leadStatus: vals.status,
          status: 'prospect',
        }),
      });
      leadForm.reset();
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard"] });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to create lead");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={leadForm.handleSubmit(onSubmit)} className="space-y-3 mt-2">
      <div>
        <label className="text-xs font-medium">Contact name *</label>
        <Input {...leadForm.register("contactName", { required: true })} placeholder="Full name" />
      </div>
      <div>
        <label className="text-xs font-medium">Telephone</label>
        <Input {...leadForm.register("telephone")} placeholder="+1 555 123 4567" />
      </div>
      <div>
        <label className="text-xs font-medium">Email</label>
        <Input type="email" {...leadForm.register("email")} placeholder="email@example.com" />
      </div>
      <div>
        <label className="text-xs font-medium">Position</label>
        <Input {...leadForm.register("position")} placeholder="Job title" />
      </div>
      <div>
        <label className="text-xs font-medium">Company Name</label>
        <Input {...leadForm.register("companyName")} placeholder="Company" />
      </div>
      <div>
        <label className="text-xs font-medium">Company Email</label>
        <Input type="email" {...leadForm.register("companyEmail")} placeholder="company@example.com" />
      </div>
<div>
        <label className="text-xs font-medium">Rating</label>
        <select {...leadForm.register("rating")} className="w-full rounded-md border px-2 py-1 text-sm bg-card text-foreground">
          <option value="" className="text-foreground">Select rating</option>
          <option className="text-foreground">Cold</option>
          <option className="text-foreground">Warm</option>
          <option className="text-foreground">Hot</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium">Status</label>
        <select {...leadForm.register("status")} className="w-full rounded-md border px-2 py-1 text-sm bg-card text-foreground">
          <option className="text-foreground">New</option>
          <option className="text-foreground">Contacted</option>
          <option className="text-foreground">Unqualified</option>
          <option className="text-foreground">Qualified</option>
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onClose} type="button">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="ml-auto">
          {isLoading ? "Creating..." : "Create Lead"}
        </Button>
      </div>
    </form>
  );
}
