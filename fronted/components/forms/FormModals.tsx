import { useFormDialog } from "@/hooks/useFormDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CreateLeadForm } from "@/components/forms/CreateLeadForm";
import { CreateClientForm } from "@/components/forms/CreateClientForm";
import { CreateSaleForm } from "@/components/forms/CreateSaleForm";

export function FormModals() {
  const { openForm, setOpenForm, editingEntity } = useFormDialog();

  // Whenever the dialog closes (via X / overlay click), clear the editing
  // entity so the next "Create" doesn't accidentally pre-fill the form.
  const handleOpenChange = (open: boolean) => {
    if (!open) setOpenForm(null);
  };

  return (
    <>
      <Dialog open={openForm === "lead"} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Lead</DialogTitle>
            <DialogDescription>Capture lead details and assign to your tenant.</DialogDescription>
          </DialogHeader>
          <CreateLeadForm onClose={() => setOpenForm(null)} />
        </DialogContent>
      </Dialog>

      <Dialog open={openForm === "client"} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEntity ? "Edit Client" : "Create New Client"}
            </DialogTitle>
            <DialogDescription>
              {editingEntity
                ? "Update the client's information below."
                : "Company and primary contact information."}
            </DialogDescription>
          </DialogHeader>
          <CreateClientForm
            onClose={() => setOpenForm(null)}
            client={editingEntity}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={openForm === "sale"} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Sale</DialogTitle>
            <DialogDescription>Record a sale for a client.</DialogDescription>
          </DialogHeader>
          <CreateSaleForm onClose={() => setOpenForm(null)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
