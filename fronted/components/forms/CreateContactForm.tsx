import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useClients } from "@/lib/api/clients";

interface CreateContactFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateContactForm({ onClose, onSuccess }: CreateContactFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const contactForm = useForm();
  const queryClient = useQueryClient();
  const { data: clientsData } = useClients();
  const clients = clientsData?.clients || [];

  const onSubmit = async (vals: any) => {
    setIsLoading(true);
    try {
      await apiFetch("/clients/contacts", {
        method: "POST",
        body: JSON.stringify({
          clientId: vals.clientId || undefined,
          name: vals.name,
          position: vals.position,
          email: vals.email,
          phone: vals.tel,
          birthday: vals.birthday || undefined,
          reportingLine: vals.reportingLine,
        }),
      });
      contactForm.reset();
      queryClient.invalidateQueries({ queryKey: ["clients"] as unknown as readonly unknown[] });
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard"] as unknown as readonly unknown[] });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to create contact");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={contactForm.handleSubmit(onSubmit)} className="space-y-3 mt-2">
      <div>
        <label className="text-xs font-medium">Related Client *</label>
        <select {...contactForm.register("clientId")} className="w-full rounded-md border px-2 py-1 text-sm">
          <option value="">Select client</option>
          {clients.map((c: any) => (
            <option key={c._id} value={c._id}>{c.name} {c.company && `- ${c.company}`}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium">Name *</label>
        <Input {...contactForm.register("name", { required: true })} placeholder="Full name" />
      </div>
      <div>
        <label className="text-xs font-medium">Position</label>
        <Input {...contactForm.register("position")} placeholder="Job title" />
      </div>
      <div>
        <label className="text-xs font-medium">Telephone</label>
        <Input {...contactForm.register("tel")} placeholder="+1 555 123 4567" />
      </div>
      <div>
        <label className="text-xs font-medium">Email</label>
        <Input type="email" {...contactForm.register("email")} placeholder="email@example.com" />
      </div>
      <div>
        <label className="text-xs font-medium">Birthday</label>
        <Input type="date" {...contactForm.register("birthday")} />
      </div>
      <div>
        <label className="text-xs font-medium">Reporting line</label>
        <Input {...contactForm.register("reportingLine")} placeholder="Manager or reporting to" />
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onClose} type="button">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="ml-auto">
          {isLoading ? "Creating..." : "Create Contact"}
        </Button>
      </div>
    </form>
  );
}
