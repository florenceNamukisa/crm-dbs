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
      await apiFetch("/leads", {
        method: "POST",
        body: JSON.stringify({
          name: vals.contactName,
          telephone: vals.telephone,
          email: vals.email,
          position: vals.position,
          co: vals.companyName,
          companyEmail: vals.companyEmail,
          rating: vals.rating,
          status: vals.status,
        }),
      });
      leadForm.reset();
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard"] as unknown as readonly unknown[] });
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
        <select {...leadForm.register("rating")} className="w-full rounded-md border px-2 py-1 text-sm">
          <option value="">Select rating</option>
          <option>Cold</option>
          <option>Warm</option>
          <option>Hot</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium">Status</label>
        <select {...leadForm.register("status")} className="w-full rounded-md border px-2 py-1 text-sm">
          <option>New</option>
          <option>Contacted</option>
          <option>Unqualified</option>
          <option>Qualified</option>
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
