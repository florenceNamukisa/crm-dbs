import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

interface CreateContactFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateContactForm({ onClose, onSuccess }: CreateContactFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const contactForm = useForm();
  const queryClient = useQueryClient();

  const onSubmit = async (vals: any) => {
    setIsLoading(true);
    try {
      await apiFetch("/contacts", {
        method: "POST",
        body: JSON.stringify({
          name: vals.name,
          organization: vals.organization,
          tel: vals.tel,
          email: vals.email,
          position: vals.position,
          birthday: vals.birthday,
          reportingLine: vals.reportingLine,
        }),
      });
      contactForm.reset();
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
        <label className="text-xs font-medium">Name *</label>
        <Input {...contactForm.register("name", { required: true })} placeholder="Full name" />
      </div>
      <div>
        <label className="text-xs font-medium">Organization</label>
        <Input {...contactForm.register("organization")} placeholder="Company or organization" />
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
        <label className="text-xs font-medium">Position</label>
        <Input {...contactForm.register("position")} placeholder="Job title" />
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
