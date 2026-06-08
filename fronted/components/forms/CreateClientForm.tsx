import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCreateClient, useUpdateClient } from "@/lib/api/clients";

interface CreateClientFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  /** If provided, the form switches to "Edit" mode and pre-fills with this client. */
  client?: any | null;
}

const SECTORS = ["IT", "Agric", "Finance", "Healthcare", "Other"];
const STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export function CreateClientForm({ onClose, onSuccess, client = null }: CreateClientFormProps) {
  const isEdit = !!client;
  const [isLoading, setIsLoading] = useState(false);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

  const clientForm = useForm({
    defaultValues: {
      companyName: "",
      companyEmail: "",
      address: "",
      name: "",
      telephone: "",
      email: "",
      position: "",
      sector: "IT",
      status: "active",
    },
  });
  const queryClient = useQueryClient();

  // Pre-fill the form when editing an existing client
  useEffect(() => {
    if (client) {
      clientForm.reset({
        companyName: client.company || client.companyName || "",
        companyEmail: client.companyEmail || "",
        address: client.address || "",
        name: client.name || "",
        telephone: client.phone || client.telephone || "",
        email: client.email || "",
        position: client.position || "",
        sector: client.industry || client.sector || "IT",
        status: client.status || "active",
      });
    }
  }, [client, clientForm]);

  const onSubmit = async (vals: any) => {
    setIsLoading(true);
    try {
      const payload = {
        name: vals.name,
        email: vals.email,
        phone: vals.telephone,
        address: vals.address,
        company: vals.companyName,
        companyEmail: vals.companyEmail,
        position: vals.position,
        industry: vals.sector,
        status: vals.status || "active",
      };

      if (isEdit && client?._id) {
        await updateClient.mutateAsync({ id: client._id, data: payload });
        toast.success("Client updated successfully");
      } else {
        await createClient.mutateAsync(payload);
        toast.success("Client created successfully");
      }

      // Refresh every consumer that shows clients
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      clientForm.reset();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || (isEdit ? "Failed to update client" : "Failed to create client"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={clientForm.handleSubmit(onSubmit)} className="space-y-3 mt-2">
      <div>
        <label className="text-xs font-medium">Company Name *</label>
        <Input
          {...clientForm.register("companyName", { required: true })}
          placeholder="Company name"
        />
      </div>
      <div>
        <label className="text-xs font-medium">Company Email</label>
        <Input
          type="email"
          {...clientForm.register("companyEmail")}
          placeholder="company@example.com"
        />
      </div>
      <div>
        <label className="text-xs font-medium">Address</label>
        <Input
          {...clientForm.register("address")}
          placeholder="Street address"
        />
      </div>
      <div>
        <label className="text-xs font-medium">Contact Name *</label>
        <Input
          {...clientForm.register("name", { required: true })}
          placeholder="Contact person"
        />
      </div>
      <div>
        <label className="text-xs font-medium">Telephone *</label>
        <Input
          {...clientForm.register("telephone", { required: true })}
          placeholder="+1 555 123 4567"
        />
      </div>
      <div>
        <label className="text-xs font-medium">Email *</label>
        <Input
          type="email"
          {...clientForm.register("email", { required: true })}
          placeholder="email@example.com"
        />
      </div>
      <div>
        <label className="text-xs font-medium">Position</label>
        <Input
          {...clientForm.register("position")}
          placeholder="Job title"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">Sector</label>
          <select
            {...clientForm.register("sector")}
            className="w-full rounded-md border px-2 py-1 text-sm"
          >
            {SECTORS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">Status</label>
          <select
            {...clientForm.register("status")}
            className="w-full rounded-md border px-2 py-1 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onClose} type="button">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="ml-auto"
        >
          {isLoading
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
              ? "Save Changes"
              : "Create Client"}
        </Button>
      </div>
    </form>
  );
}
