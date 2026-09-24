import type {
  CreateQuoteRequestPayload,
  QuoteRequestResponse,
  UpdateQuoteRequestDetailPayload,
} from "@/types/quoteRequest";

const normalizeInteger = (value: number | null) => {
  if (value === null || value === undefined) return value;

  const number = Number(value);

  return Number.isFinite(number) ? Math.trunc(number) : null;
};

const normalizeDetails = <
  T extends CreateQuoteRequestPayload["details"][number] | UpdateQuoteRequestDetailPayload,
>(
  details: T[],
) =>
  details.map((detail) => ({
    ...detail,
    base: normalizeInteger(detail.base),
    height: normalizeInteger(detail.height),
  }));

// Función recursiva para parsear objetos complejos a FormData
function appendToFormData(formData: FormData, data: any, parentKey = "") {
  if (data === null || data === undefined) return;

  if (data instanceof File) {
    formData.append(parentKey, data);
  } else if (Array.isArray(data)) {
    data.forEach((item, index) =>
      appendToFormData(formData, item, `${parentKey}[${index}]`),
    );
  } else if (typeof data === "object") {
    Object.entries(data).forEach(([key, value]) => {
      appendToFormData(
        formData,
        value,
        parentKey ? `${parentKey}[${key}]` : key,
      );
    });
  } else {
    formData.append(parentKey, String(data));
  }
}

export const getQuoteRequests = async (params?: {
  q?: string;
  page?: number;
  itemsPerPage?: number;
  sortBy?: string;
  orderBy?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}) => {
  return await $api("/quote-requests", {
    method: "GET",
    query: params,
  });
};

export const createQuoteRequest = async (
  payload: CreateQuoteRequestPayload & { attachments?: File[] },
) => {
  const formData = new FormData();
  appendToFormData(formData, {
    ...payload,
    details: normalizeDetails(payload.details),
  });

  return await $api("/quote-requests", {
    method: "POST",
    body: formData,
  });
};

export const getQuoteRequest = async (
  id: number,
): Promise<QuoteRequestResponse> => {
  return await $api(`/quote-requests/${id}`);
};

export const updateQuoteRequest = async (
  id: number,
  payload: {
    subject: string;
    observations: string | null;
    details: UpdateQuoteRequestDetailPayload[];
    attachments?: File[];
    deleted_attachments?: number[];
  },
) => {
  const formData = new FormData();
  appendToFormData(formData, {
    ...payload,
    details: normalizeDetails(payload.details),
  });

  formData.append("_method", "PUT");

  return await $api(`/quote-requests/${id}`, {
    method: "POST",
    body: formData,
  });
};

export const submitQuoteRequest = async (id: number) =>
  await $api(`/quote-requests/${id}/submit`, {
    method: "POST",
  });
