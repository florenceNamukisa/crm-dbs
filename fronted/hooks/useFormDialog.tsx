import { createContext, ReactNode, useState, useContext } from "react";

export type FormType = "lead" | "client" | "sale" | "contact" | null;

interface FormContextValue {
  openForm: FormType;
  /** Optional entity data to pre-fill the form (e.g. a client to edit). */
  editingEntity: any | null;
  /**
   * Open a form.
   * - `setOpenForm("client")`         -> open the "Create New Client" dialog
   * - `setOpenForm("client", client)` -> open the "Edit Client" dialog, pre-filled
   */
  setOpenForm: (form: FormType, entity?: any) => void;
}

const FormContext = createContext<FormContextValue | undefined>(undefined);

export function FormProvider({ children }: { children: ReactNode }) {
  const [openForm, setOpenFormState] = useState<FormType>(null);
  const [editingEntity, setEditingEntity] = useState<any | null>(null);

  const setOpenForm = (form: FormType, entity?: any) => {
    setOpenFormState(form);
    setEditingEntity(entity ?? null);
  };

  return (
    <FormContext.Provider
      value={{ openForm, editingEntity, setOpenForm }}
    >
      {children}
    </FormContext.Provider>
  );
}

export function useFormDialog() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useFormDialog must be used within FormProvider");
  }
  return context;
}
