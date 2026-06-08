import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useClients } from "@/lib/api/clients";

interface CreateTaskFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateTaskForm({ onClose, onSuccess }: CreateTaskFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const taskForm = useForm();
  const queryClient = useQueryClient();
  const { data: clientsData } = useClients();
  const clients = clientsData?.clients || [];

  const onSubmit = async (vals: any) => {
    setIsLoading(true);
    try {
      await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({
          clientId: vals.clientId || undefined,
          title: vals.subject,
          subject: vals.subject,
          description: vals.description || "",
          dueDate: vals.dueDate || undefined,
          priority: vals.priority || "Medium",
          status: vals.status === "Completed" ? "completed" : vals.status === "Deferred" ? "deferred" : vals.status === "Waiting on someone else" ? "waiting" : "in_progress",
          contactPerson: vals.contact || "",
        }),
      });
      taskForm.reset();
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard"] });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to create task");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={taskForm.handleSubmit(onSubmit)} className="space-y-3 mt-2">
      <div>
        <label className="text-xs font-medium">Related Client *</label>
        <select {...taskForm.register("clientId")} className="w-full rounded-md border px-2 py-1 text-sm">
          <option value="">Select client</option>
          {clients.map((c: any) => (
            <option key={c._id} value={c._id}>{c.name} {c.company && `- ${c.company}`}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium">Related Contact</label>
        <Input {...taskForm.register("contact")} placeholder="Contact person" />
      </div>
      <div>
        <label className="text-xs font-medium">Type / Subject *</label>
        <select {...taskForm.register("subject", { required: true })} className="w-full rounded-md border px-2 py-1 text-sm">
          <option value="">Select type</option>
          <option>Call</option>
          <option>Support</option>
          <option>Follow-up</option>
          <option>Meeting</option>
          <option>Other</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium">Description</label>
        <Textarea {...taskForm.register("description")} placeholder="Task details..." />
      </div>
      <div>
        <label className="text-xs font-medium">Due date</label>
        <Input type="date" {...taskForm.register("dueDate")} />
      </div>
      <div>
        <label className="text-xs font-medium">Status</label>
        <select {...taskForm.register("status")} className="w-full rounded-md border px-2 py-1 text-sm">
          <option>In progress</option>
          <option>Completed</option>
          <option>Waiting on someone else</option>
          <option>Deferred</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium">Priority *</label>
        <select {...taskForm.register("priority", { required: true })} className="w-full rounded-md border px-2 py-1 text-sm">
          <option>Low</option>
          <option>Medium</option>
          <option>Critical</option>
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onClose} type="button">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="ml-auto">
          {isLoading ? "Creating..." : "Create Task"}
        </Button>
      </div>
    </form>
  );
}
