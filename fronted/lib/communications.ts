import { apiFetch } from "@/lib/auth";

export async function sendWhatsAppMessage(phoneNumber: string, message: string = "") {
  try {
    const { whatsappLink } = await apiFetch<{ whatsappLink: string }>("/whatsapp/open", {
      method: "POST",
      body: JSON.stringify({ phoneNumber, message }),
    });
    window.open(whatsappLink, "_blank");
    return true;
  } catch (err: any) {
    console.error("Failed to open WhatsApp:", err);
    return false;
  }
}

export async function sendEmail(to: string, subject: string, body: string) {
  try {
    const result = await apiFetch("/email/send", {
      method: "POST",
      body: JSON.stringify({ to, subject, body }),
    });
    return result;
  } catch (err: any) {
    console.error("Failed to send email:", err);
    throw err;
  }
}

export const WHATSAPP_CONTACT = "0770821677";

export function openWhatsAppDirectly() {
  sendWhatsAppMessage(WHATSAPP_CONTACT, "Hi, I'm reaching out from the CRM");
}
