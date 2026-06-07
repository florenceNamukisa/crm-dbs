import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

interface CreateClientFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateClientForm({ onClose, onSuccess }: CreateClientFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const clientForm = useForm();
  const queryClient = useQueryClient();

  const onSubmit = async (vals: any) => {
    setIsLoading(true);
    try {
      await apiFetch("/clients", {
        method: "POST",
        body: JSON.stringify({
          name: vals.name || vals.contactName,
          email: vals.email || vals.contactEmail,
          phone: vals.telephone,
          address: vals.address,
          company: vals.companyName,
          position: vals.position,
          industry: vals.sector,
          status: 'active',
        }),
      });
      clientForm.reset();
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard"] as unknown as readonly unknown[] });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to create client");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={clientForm.handleSubmit(onSubmit)} className="space-y-3 mt-2">
      <div>
        <label className="text-xs font-medium">Company Name *</label>
        <Input {...clientForm.register("companyName", { required: true })} placeholder="Company name" />
      </div>
      <div>
        <label className="text-xs font-medium">Company Email</label>
        <Input type="email" {...clientForm.register("companyEmail")} placeholder="company@example.com" />
      </div>
      <div>
        <label className="text-xs font-medium">Address</label>
        <Input {...clientForm.register("address")} placeholder="Street address" />
      </div>
      <div>
        <label className="text-xs font-medium">Contact Name *</label>
        <Input {...clientForm.register("name", { required: true })} placeholder="Contact person" />
      </div>
      <div>
        <label className="text-xs font-medium">Telephone *</label>
        <Input {...clientForm.register("telephone", { required: true })} placeholder="+1 555 123 4567" />
      </div>
      <div>
        <label className="text-xs font-medium">Email *</label>
        <Input type="email" {...clientForm.register("email", { required: true })} placeholder="email@example.com" />
      </div>
      <div>
        <label className="text-xs font-medium">Position</label>
        <Input {...clientForm.register("position")} placeholder="Job title" />
      </div>
      <div>
        <label className="text-xs font-medium">Sector</label>
        <select {...clientForm.register("sector")} className="w-full rounded-md border px-2 py-1 text-sm">
          <option>IT</option>
          <option>Agric</option>
          <option>Finance</option>
          <option>Healthcare</option>
          <option>Other</option>
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onClose} type="button">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="ml-auto">
          {isLoading ? "Creating..." : "Create Client"}
        </Button>
      </div>
    </form>
  );
}
