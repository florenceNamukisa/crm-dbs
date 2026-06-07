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
  const { openForm, setOpenForm } = useFormDialog();

  return (
    <>
      <Dialog open={openForm === "lead"} onOpenChange={(open) => !open && setOpenForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Lead</DialogTitle>
            <DialogDescription>Capture lead details and assign to your tenant.</DialogDescription>
          </DialogHeader>
          <CreateLeadForm onClose={() => setOpenForm(null)} />
        </DialogContent>
      </Dialog>

      <Dialog open={openForm === "client"} onOpenChange={(open) => !open && setOpenForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
            <DialogDescription>Company and primary contact information.</DialogDescription>
          </DialogHeader>
          <CreateClientForm onClose={() => setOpenForm(null)} />
        </DialogContent>
      </Dialog>

      <Dialog open={openForm === "sale"} onOpenChange={(open) => !open && setOpenForm(null)}>
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
