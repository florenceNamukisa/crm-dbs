import { createContext, ReactNode, useState, useContext } from "react";

type FormType = "lead" | "client" | "sale" | "contact" | "task" | null;

interface FormContextValue {
  openForm: FormType;
  setOpenForm: (form: FormType) => void;
}

const FormContext = createContext<FormContextValue | undefined>(undefined);

export function FormProvider({ children }: { children: ReactNode }) {
  const [openForm, setOpenForm] = useState<FormType>(null);

  return (
    <FormContext.Provider value={{ openForm, setOpenForm }}>
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
