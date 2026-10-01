export interface ContactMessagePayload {
  full_name: string;
  email: string;
  phone: string | null;
  message: string;
}

export interface ContactMessageResponse {
  message: string;
  contact_message: {
    id: number;
    sent_at: string | null;
  };
}

export const sendContactMessage = async (
  payload: ContactMessagePayload & { attachments?: File[] },
): Promise<ContactMessageResponse> =>
  (() => {
    const formData = new FormData();

    formData.append("full_name", payload.full_name);
    formData.append("email", payload.email);
    if (payload.phone) formData.append("phone", payload.phone);
    formData.append("message", payload.message);
    payload.attachments?.forEach((file) => formData.append("attachments[]", file));

    return $api("/contact-messages", {
      method: "POST",
      body: formData,
    });
  })();
