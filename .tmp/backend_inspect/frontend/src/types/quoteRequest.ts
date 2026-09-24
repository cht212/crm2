export interface QuoteRequestDetailPayload {
  product_type_id: number;
  subtype_id: number;
  product_id: number;
  lengths_id: number | null;
  finish_id: number | null;
  thickness: number | null;
  base: number | null;
  height: number | null;
  quantity: number;
  observation: string | null;
  characteristics: number[];
}

export type UpdateQuoteRequestDetailPayload = Omit<
  QuoteRequestDetailPayload,
  "product_type_id" | "product_id"
> & {
  id?: number | null;
  product_type_id: number;
  subtype_id: number;
  product_id: number;
};

export interface CreateQuoteRequestPayload {
  subject: string;
  observations: string | null;
  details: QuoteRequestDetailPayload[];
}

export interface QuoteRequestStatus {
  id: number;
  name: string;
  color_hex: string;
}

export interface QuoteRequestStatusesResponse {
  statuses: QuoteRequestStatus[];
}

export interface QuoteRequestCustomer {
  id: number;
  company_name: string;
  tax_number: string;
  trade_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  department: string | null;
  province: string | null;
  district: string | null;
}

export interface QuoteRequestDetail {
  id: number;
  product_type_id: number | null;
  subtype_id: number | null;
  product_id: number | null;
  lengths_id: number | null;
  finish_id: number | null;
  thickness: number | null;
  base: number | null;
  height: number | null;
  quantity: number;
  observation: string | null;
  characteristics: number[];
  
  product_type?: {
    id: number;
    name: string;
  } | null;

  product?: {
    id: number;
    name: string;
  } | null;

  length?: {
    id: number;
    code: string;
    value: string;
  } | null;

  finish?: {
    id: number;
    name: string;
  } | null;
}

export interface QuoteRequestHistory {
  id: number;
  action: string;
  previous_status_id: number | null;
  new_status_id: number;
  comment: string | null;
  user_id: string;
  created_at: string;

  previous_status: QuoteRequestStatus | null;
  new_status: QuoteRequestStatus;
  user: {
    id: string;
    name: string;
  };
  changes: {
    details?: {
      added?: QuoteRequestHistoryDetailChange[];
      removed?: QuoteRequestHistoryDetailChange[];
      updated?: QuoteRequestHistoryDetailChange[];
    };
    header?: Record<string, { old: string | null; new: string | null }>;
    attachments?: {
      added?: unknown[];
      removed?: unknown[];
    };
  } | null;
}

export interface QuoteRequestHistoryDetailChange {
  detail_id: number;
  product_id: number;
  product_name: string | null;
  quantity?: number;
}

export interface QuoteRequestAttachment {
  id: number;
  original_name: string;
  path: string;
  mime_type: string;
  size: number;
}

export interface QuoteRequest {
  id: number;
  request_number: string;
  customer_id: number;
  subject: string;
  observations: string | null;
  status_id: number;
  requested_at: string;
  created_by: string;
  updated_by: string | null;
  is_active: boolean;

  customer: QuoteRequestCustomer;
  status: QuoteRequestStatus;
  details: QuoteRequestDetail[];
  attachments: QuoteRequestAttachment[];
  histories: QuoteRequestHistory[];
}

export interface QuoteRequestResponse {
  quote_response: QuoteRequest;
}

export interface QuoteRequestListItem {
  id: number;
  request_number: string;
  subject: string;
  requested_at: string;
  is_active: boolean;
  status: {
    id: number;
    name: string;
    color_hex: string;
  };
}

export interface QuoteRequestSummary {
  total: number;
  pending: number;
  inProcess: number;
  reviewed: number;
  quoted: number;
}

export interface QuoteRequestListResponse {
  quoteRequests: QuoteRequestListItem[];
  totalQuoteRequests: number;
  per_page: number;
  current_page: number;
  summary: QuoteRequestSummary;
}

export interface QuoteRequestHistoryResponse {
  histories: QuoteRequestHistory[];
}
