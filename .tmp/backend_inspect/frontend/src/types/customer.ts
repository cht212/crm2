export interface CustomerContact {
  id: number;
  customer_id: number;
  name: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  is_primary: number;
  is_active: boolean;
}

export interface Customer {
  id: number;
  company_name: string;
  tax_number: string;
  trade_name: string;
  email: string;
  phone: string;
  address: string;
  department: string;
  province: string;
  district: string;
  is_active: boolean | string | number;
  users_count?: number;
  users?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    is_active: boolean;
  }[];
  contacts?: CustomerContact[];
}

export interface CustomerForm {
  company_name: string;
  tax_number: string;
  trade_name: string;
  email: string;
  phone: string;
  address: string;
  department: string;
  province: string;
  district: string;

  contact: {
    name: string;
    position: string;
    email: string;
    phone: string;
  };
  create_user?: boolean;
  user?: {
    name: string;
    email: string;
    phone: string;
    password: string;
    password_confirmation: string;
  };
  assigned_user?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    is_active: boolean;
  } | null;
}

export interface CustomerListResponse {
  customers: Customer[];
  totalCustomers: number;
  per_page: number;
  current_page: number;
}
